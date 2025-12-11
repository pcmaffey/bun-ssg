import { createElement } from 'react'
import { compile, run } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import matter from 'gray-matter'
import type { PostMeta } from './types'
import {  mdxComponents } from '../registry'
import { getIslandPath, getIslandExport } from './islands'
import { url } from './utils'

// Directory paths
export const ROOT_DIR = import.meta.dir.replace('/src/core', '')

// Read package.json for dependency versions
const pkg = await Bun.file(`${ROOT_DIR}/package.json`).json() as {
  dependencies?: Record<string, string>
}

function getVersion(name: string): string {
  const version = pkg.dependencies?.[name]
  if (!version) throw new Error(`Missing dependency: ${name}`)
  // Strip version prefix (^, ~, etc)
  return version.replace(/^[\^~]/, '')
}
export const POSTS_DIR = `${ROOT_DIR}/src/posts`
export const PUBLIC_DIR = `${ROOT_DIR}/public`
export const STYLES_DIR = `${ROOT_DIR}/src/styles`
export const PAGES_DIR = `${ROOT_DIR}/src/pages`
export const CACHE_DIR = `${ROOT_DIR}/.cache`

// Detect islands used in rendered HTML by scanning for data-island attributes
export function detectIslands(html: string): string[] {
  const islands: string[] = []
  const regex = /data-island="([^"]+)"/g
  let match
  while ((match = regex.exec(html)) !== null) {
    if (!islands.includes(match[1])) {
      islands.push(match[1])
    }
  }
  return islands
}

// CDN dependencies that are always externalized (shared across all islands)
const cdnDeps: Record<string, string[]> = {
  react: ['', '/jsx-runtime', '/jsx-dev-runtime'],
  'react-dom': ['', '/client'],
}

// Build import map from package.json versions
function buildImportMap(extraDeps: string[] = []): Record<string, string> {
  const imports: Record<string, string> = {}
  
  for (const [name, subpaths] of Object.entries(cdnDeps)) {
    const version = getVersion(name)
    for (const subpath of subpaths) {
      const key = name + subpath
      imports[key] = `https://esm.sh/${name}@${version}${subpath}`
    }
  }
  
  // Add extra dependencies (detected from islands)
  for (const dep of extraDeps) {
    if (imports[dep]) continue
    const version = getVersion(dep)
    imports[dep] = `https://esm.sh/${dep}@${version}`
  }
  
  return imports
}

// Get all external module names for bundler config
export function getExternalModules(extraDeps: string[] = []): string[] {
  const externals: string[] = []
  for (const [name, subpaths] of Object.entries(cdnDeps)) {
    for (const subpath of subpaths) {
      externals.push(name + subpath)
    }
  }
  return [...externals, ...extraDeps]
}

// Generate import map script tag
export function generateImportMap(extraDeps: string[] = []): string {
  const imports = buildImportMap(extraDeps)
  return `<script type="importmap">
${JSON.stringify({ imports }, null, 2)}
</script>`
}

// Default import map (React only, for backwards compatibility)
export const importMap = generateImportMap()

// Detect external dependencies from island source files
export async function detectIslandDeps(islandPaths: Record<string, string | [string, string]>): Promise<string[]> {
  const deps = new Set<string>()
  const importRegex = /(?:import|from)\s+['"]([^'"./][^'"]*)['"]/g
  
  for (const entry of Object.values(islandPaths)) {
    const filePath = Array.isArray(entry) ? entry[0] : entry
    const fullPath = `${ROOT_DIR}/src/${filePath}`
    const source = await Bun.file(fullPath).text()
    
    let match
    while ((match = importRegex.exec(source)) !== null) {
      const dep = match[1]
      // Skip React (already in cdnDeps) and node builtins
      if (dep.startsWith('react') || dep.startsWith('node:')) continue
      // Get base package name (handle scoped packages)
      const baseName = dep.startsWith('@') 
        ? dep.split('/').slice(0, 2).join('/')
        : dep.split('/')[0]
      deps.add(baseName)
    }
  }
  
  // Filter to only deps that exist in package.json
  return [...deps].filter(dep => pkg.dependencies?.[dep])
}

// Generate island script/style tags
export function generateIslandTags(islands: string[]): string {
  if (islands.length === 0) return ''
  const styles = islands.map(island => `<link rel="stylesheet" href="${url(`/islands/${island}.css`)}">`).join('\n')
  const scripts = islands.map(island => `<script type="module" src="${url(`/islands/${island}.js`)}"></script>`).join('\n')
  return styles + scripts
}

// Generate hydration wrapper code for an island
export function generateHydrationWrapper(name: string, entry: string | [string, string]): string {
  const path = getIslandPath(entry)
  const exportName = getIslandExport(entry)
  const fullPath = `${ROOT_DIR}/src/${path}`
  
  const importStatement = exportName
    ? `import { ${exportName} as Component } from '${fullPath}'`
    : `import Component from '${fullPath}'`
  
  return `
import { createRoot } from 'react-dom/client'
${importStatement}

const hydrate = () => {
  document.querySelectorAll('[data-island="${name}"]').forEach(el => {
    createRoot(el).render(<Component />)
  })
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(hydrate)
} else {
  hydrate()
}
`
}

// Load all posts from the posts directory
export async function loadPosts(): Promise<PostMeta[]> {
  const posts: PostMeta[] = []

  // Load folder-based posts (slug/index.mdx)
  const folderGlob = new Bun.Glob('*/index.mdx')
  for await (const file of folderGlob.scan(POSTS_DIR)) {
    const slug = file.replace('/index.mdx', '')
    const content = await Bun.file(`${POSTS_DIR}/${file}`).text()
    const { data } = matter(content)
    posts.push(extractPostMeta(data, slug))
  }

  // Load standalone posts (*.mdx, excluding index.mdx in folders)
  const standaloneGlob = new Bun.Glob('*.mdx')
  for await (const file of standaloneGlob.scan(POSTS_DIR)) {
    if (file.includes('/')) continue
    const slug = file.replace('.mdx', '')
    const content = await Bun.file(`${POSTS_DIR}/${file}`).text()
    const { data } = matter(content)
    posts.push(extractPostMeta(data, slug))
  }

  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  return posts
}

function extractPostMeta(data: Record<string, unknown>, slug: string): PostMeta {
  // Resolve relative image paths to post folder
  const rawImage = data.image as string | undefined
  const image = rawImage && !rawImage.startsWith('/') && !rawImage.startsWith('http')
    ? `/${slug}/${rawImage}`
    : rawImage

  return {
    title: data.title as string,
    slug,
    subtitle: data.subtitle as string | undefined,
    description: data.description as string | undefined,
    image,
    cover: data.cover as string | undefined,
    publishedAt: data.publishedAt as string,
    updatedAt: data.updatedAt as string | undefined,
  }
}

// Get the file path for a post (folder-based or standalone)
export async function getPostPath(slug: string): Promise<string> {
  const folderPath = `${POSTS_DIR}/${slug}/index.mdx`
  if (await Bun.file(folderPath).exists()) {
    return folderPath
  }
  return `${POSTS_DIR}/${slug}.mdx`
}

// Load a cover image/component for a post (must be in post folder)
export async function loadCover(coverPath: string, slug: string): Promise<React.ReactNode | null> {
  const fullPath = `${POSTS_DIR}/${slug}/${coverPath}`
  const assetUrl = url(`/${slug}/${coverPath}`)

  if (coverPath.endsWith('.svg')) {
    const svgContent = await Bun.file(fullPath).text()
    return createElement('div', { dangerouslySetInnerHTML: { __html: svgContent } })
  }

  if (/\.(png|jpe?g|gif|webp)$/i.test(coverPath)) {
    return createElement('img', { src: assetUrl, alt: '' })
  }

  const module = await import(`${fullPath}.tsx`)
  const Component = module.Cover || module.default
  return createElement(Component)
}

// Compile and run MDX content to get a React element
export async function compileMDX(mdxContent: string): Promise<React.ReactNode> {
  const compiled = await compile(mdxContent, {
    outputFormat: 'function-body',
    development: false
  })

  const { default: MDXContent } = await run(String(compiled), {
    jsx: jsxRuntime.jsx,
    jsxs: jsxRuntime.jsxs,
    Fragment: jsxRuntime.Fragment,
    baseUrl: import.meta.url
  })

  return createElement(MDXContent, { components: mdxComponents })
}

// Re-export CSS module utilities (in separate file to avoid circular deps)
export { bundlePageCSS } from './cssModules'


// Dynamic page loader
export async function loadPage(name: string): Promise<React.FC<Record<string, unknown>>> {
  const module = await import(`${PAGES_DIR}/${name}.tsx`)
  const exportName = name === 'index' ? 'IndexPage'
    : name === '404' ? 'NotFoundPage'
    : `${name.charAt(0).toUpperCase()}${name.slice(1)}Page`
  return module[exportName] || module.default
}

// Discover all static pages (excludes post.tsx which is a template)
export async function discoverPages(): Promise<string[]> {
  const pages: string[] = []
  const pageGlob = new Bun.Glob('*.tsx')
  for await (const file of pageGlob.scan(PAGES_DIR)) {
    const name = file.replace('.tsx', '')
    if (name !== 'post') pages.push(name)
  }
  return pages
}

// Get the route path for a page name
export function getPageRoute(name: string): string {
  if (name === 'index') return url('/')
  if (name === '404') return url('/404')
  return url(`/${name}`)
}

