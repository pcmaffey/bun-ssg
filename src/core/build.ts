// Register SVG redirect plugin before any imports that use SVGs
// This must be done with dynamic imports to ensure proper ordering
const { registerSvgRedirect } = await import('./svgRedirect')

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import matter from 'gray-matter'
import type { PostMeta } from './types'
import { bundlePageCSS } from './cssModules'

// Bundle CSS modules FIRST before any component imports
// This populates the cache file that the cssLoader plugin reads from
await bundlePageCSS(true)

const {
  ROOT_DIR,
  POSTS_DIR,
  PUBLIC_DIR,
  STYLES_DIR,
  CACHE_DIR,
  detectIslands,
  generateImportMap,
  generateIslandTags,
  generateHydrationWrapper,
  detectIslandDeps,
  getExternalModules,
  loadPosts,
  loadCover,
  getPostPath,
  compileMDX,
  loadPage,
  discoverPages,
} = await import('./shared')

import { islandPaths } from '../registry'
import { site, rss } from '../config'

const DIST_DIR = `${ROOT_DIR}/dist`

async function build() {
  console.log('Building site...')

  // Clean dist directory
  await Bun.$`rm -rf ${DIST_DIR}`.quiet()
  await Bun.$`mkdir -p ${DIST_DIR}`.quiet()

  // Detect island dependencies for import map and externals
  const islandDeps = await detectIslandDeps(islandPaths)
  if (islandDeps.length > 0) {
    console.log(`Detected island dependencies: ${islandDeps.join(', ')}`)
  }

  // Copy public assets
  console.log('Copying public assets...')
  await Bun.$`cp -r ${PUBLIC_DIR}/* ${DIST_DIR}/`.quiet()

  // Bundle CSS
  console.log('Bundling CSS...')
  await bundleCSS()

  // Bundle islands (interactive components)
  console.log('Bundling islands...')
  await bundleIslands(islandDeps)

  // Load and process posts
  console.log('Processing MDX posts...')
  const posts = await loadPosts()

  // Build static pages (auto-discover from pages directory)
  console.log('Building static pages...')
  const pages = await discoverPages()
  for (const name of pages) {
    const Page = await loadPage(name)
    const outputPath = name === 'index' ? `${DIST_DIR}/index.html`
      : name === '404' ? `${DIST_DIR}/404.html`
      : `${DIST_DIR}/${name}/index.html`
    
    await writeHtml(outputPath, createElement(Page, { posts }), islandDeps)
    console.log(`  Built: ${name}`)
  }

  // Build post pages and copy post assets
  console.log('Building post pages...')
  const PostPage = await loadPage('post')
  for (const post of posts) {
    const content = await renderPost(post)
    const cover = post.cover ? await loadCover(post.cover, post.slug) : null
    const element = createElement(PostPage, { meta: post, children: content, cover })
    await writeHtml(`${DIST_DIR}/${post.slug}/index.html`, element, islandDeps)
    
    // Copy post folder assets (if folder-based post)
    const postFolder = `${POSTS_DIR}/${post.slug}`
    if (await Bun.file(`${postFolder}/index.mdx`).exists()) {
      const assetGlob = new Bun.Glob('*')
      for await (const asset of assetGlob.scan(postFolder)) {
        if (asset === 'index.mdx') continue
        await Bun.$`cp ${postFolder}/${asset} ${DIST_DIR}/${post.slug}/`.quiet()
      }
    }
  }

  // Generate RSS feed
  console.log('Generating RSS feed...')
  await writeFile(`${DIST_DIR}/rss.xml`, generateRSS(posts))

  console.log(`Build complete! ${posts.length} posts generated.`)
}

async function bundleCSS() {
  const globalCSS = await Bun.file(`${STYLES_DIR}/global.css`).text()
  // CSS modules already bundled at startup, just read the output
  const modulesCSS = await bundlePageCSS(true)
  await writeFile(`${DIST_DIR}/styles.css`, globalCSS + '\n' + modulesCSS)
}

async function cleanupIslandWrappers() {
  const currentIslands = new Set(Object.keys(islandPaths))
  const glob = new Bun.Glob('*-wrapper.tsx')
  for await (const file of glob.scan(CACHE_DIR)) {
    const islandName = file.replace('-wrapper.tsx', '')
    if (!currentIslands.has(islandName)) {
      await Bun.file(`${CACHE_DIR}/${file}`).unlink()
    }
  }
}

async function bundleIslands(extraDeps: string[]) {
  const externals = getExternalModules(extraDeps)
  
  await Bun.$`mkdir -p ${CACHE_DIR}`.quiet()
  
  // Clean up stale island wrappers from removed islands
  await cleanupIslandWrappers()
  
  // Bundle individual islands from registry with auto-generated hydration wrappers
  for (const [name, componentPath] of Object.entries(islandPaths) as [string, string][]) {
    const wrapperCode = generateHydrationWrapper(name, componentPath)
    const wrapperPath = `${CACHE_DIR}/${name}-wrapper.tsx`
    await Bun.write(wrapperPath, wrapperCode)
    
    const result = await Bun.build({
      entrypoints: [wrapperPath],
      outdir: `${DIST_DIR}/islands`,
      naming: `${name}.[ext]`,
      minify: true,
      target: 'browser',
      format: 'esm',
      external: externals
    })

    console.log(`Island ${name}: success=${result.success}, outputs=${result.outputs.length}`)
    if (!result.success) {
      console.error(`Failed to bundle island ${name}:`, result.logs)
    } else if (result.logs.length > 0) {
      console.log(`Island ${name} logs:`, result.logs)
    }
  }
}

async function renderPost(post: PostMeta): Promise<React.ReactNode> {
  const postPath = await getPostPath(post.slug)
  const file = await Bun.file(postPath).text()
  const { content: mdxContent } = matter(file)
  return compileMDX(mdxContent)
}

function generateRSS(posts: PostMeta[]): string {
  const items = posts
    .map(
      post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${site.url}/${post.slug}</link>
      <guid>${site.url}/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${post.subtitle || post.description || ''}]]></description>
    </item>
  `
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${rss.title}</title>
    <link>${site.url}</link>
    <description>${rss.description}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`
}

async function writeHtml(path: string, element: React.ReactElement, extraDeps: string[]) {
  const markup = renderToStaticMarkup(element)
  const islands = detectIslands(markup)
  const islandTags = generateIslandTags(islands)
  let html = '<!DOCTYPE html>' + markup
  if (islands.length > 0) {
    const importMap = generateImportMap(extraDeps)
    html = html.replace('</head>', importMap + '</head>')
    html = html.replace('</body>', islandTags + '</body>')
  }
  await writeFile(path, html)
}

async function writeFile(path: string, content: string) {
  const dir = path.substring(0, path.lastIndexOf('/'))
  await Bun.$`mkdir -p ${dir}`.quiet()
  await Bun.write(path, content)
}

// Run build
build().catch(console.error)
