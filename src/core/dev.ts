import { serve } from 'bun'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import matter from 'gray-matter'
import type { PostMeta } from './types'
import {
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
  bundlePageCSS,
  loadPage,
  discoverPages,
  getPageRoute,
} from './shared'
import { islandPaths } from '../registry'

// Detect island dependencies at startup
const islandDeps = await detectIslandDeps(islandPaths)
const importMap = generateImportMap(islandDeps)
const externalModules = getExternalModules(islandDeps)

const PORT = 3100

// Live reload via Server-Sent Events
const sseClients = new Set<ReadableStreamDefaultController>()
let pendingReload = false

function broadcastReload(): void {
  if (sseClients.size === 0) {
    // No clients connected yet (e.g. after server restart)
    // Mark reload as pending so new connections get it
    pendingReload = true
    return
  }
  for (const controller of sseClients) {
    try {
      controller.enqueue('data: reload\n\n')
    } catch {
      sseClients.delete(controller)
    }
  }
}

const liveReloadScript = `
<script>
(function() {
  let wasConnected = false;
  let reconnecting = false;
  const sse = new EventSource("/__dev__");
  sse.onmessage = function(e) {
    if (e.data === "reload") {
      location.reload();
    } else if (e.data === "connected") {
      if (reconnecting) location.reload();
      wasConnected = true;
      reconnecting = false;
    }
  };
  sse.onerror = function() {
    if (wasConnected) reconnecting = true;
  };
})();
</script>
`

async function renderPost(slug: string): Promise<{ meta: PostMeta; content: React.ReactNode } | null> {
  try {
    const postPath = await getPostPath(slug)
    const file = await Bun.file(postPath).text()
    const { content: mdxContent, data } = matter(file)

    const meta: PostMeta = {
      title: data.title,
      slug: data.slug,
      subtitle: data.subtitle,
      description: data.description,
      image: data.image,
      cover: data.cover,
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt
    }

    const content = await compileMDX(mdxContent)
    return { meta, content }
  } catch {
    return null
  }
}

function html(element: React.ReactElement, status = 200): Response {
  const markup = renderToStaticMarkup(element)
  const islands = detectIslands(markup)
  const islandTags = generateIslandTags(islands)
  let content = '<!DOCTYPE html>' + markup
  if (islands.length > 0) {
    content = content.replace('</head>', importMap + '</head>')
    content = content.replace('</body>', islandTags + liveReloadScript + '</body>')
  } else {
    content = content.replace('</body>', liveReloadScript + '</body>')
  }
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  })
}

function css(content: string): Response {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  })
}

function js(content: string): Response {
  return new Response(content, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
  })
}

// Initialize CSS modules and posts at startup
let cachedCSS = ''
async function initCSS() {
  const globalCSS = await Bun.file(`${STYLES_DIR}/global.css`).text()
  const modulesCSS = await bundlePageCSS(false)
  cachedCSS = globalCSS + '\n' + modulesCSS
}
await initCSS()

let posts = await loadPosts()

const server = serve({
  port: PORT,
  development: true,
  idleTimeout: 0,

  async fetch(req) {
    const url = new URL(req.url)
    let path = url.pathname

    // Remove trailing slash (except for root)
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1)
    }

    // Health check for dev-runner
    if (path === '/__health__') {
      return new Response('ok')
    }

    // Reload trigger from dev-runner
    if (path === '/__reload__' && req.method === 'POST') {
      // Re-bundle CSS modules before reload so cache is fresh
      await initCSS()
      broadcastReload()
      return new Response('ok')
    }

    // Live reload SSE endpoint
    if (path === '/__dev__') {
      const stream = new ReadableStream({
        start(controller) {
          sseClients.add(controller)
          if (pendingReload) {
            // Send pending reload from server restart
            controller.enqueue('data: reload\n\n')
            pendingReload = false
          } else {
            controller.enqueue('data: connected\n\n')
          }
        },
        cancel(controller) {
          sseClients.delete(controller)
        }
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // Serve CSS (global + bundled CSS modules from pages)
    if (path === '/styles.css') {
      // Re-bundle on each request in dev for hot reload
      await initCSS()
      return css(cachedCSS)
    }

    // Serve islands (build on the fly in dev with auto-generated hydration wrapper)
    if (path.startsWith('/islands/') && (path.endsWith('.js') || path.endsWith('.css'))) {
      const islandName = path.replace('/islands/', '').replace(/\.(js|css)$/, '')
      const requestedExt = path.endsWith('.css') ? 'css' : 'js'
      
      const componentPath = islandPaths[islandName as keyof typeof islandPaths]
      if (!componentPath) {
        return new Response('Island not found in registry', { status: 404 })
      }
      
      try {
        await Bun.$`mkdir -p ${CACHE_DIR}`.quiet()
        const wrapperCode = generateHydrationWrapper(islandName, componentPath)
        const wrapperPath = `${CACHE_DIR}/${islandName}-wrapper.tsx`
        await Bun.write(wrapperPath, wrapperCode)
        
        const result = await Bun.build({
          entrypoints: [wrapperPath],
          naming: '[name].[ext]',
          minify: false,
          target: 'browser',
          format: 'esm',
          define: {
            'process.env.NODE_ENV': '"development"'
          },
          external: externalModules
        })
        
        if (result.success) {
          for (const output of result.outputs) {
            const isCSS = output.kind === 'asset' || output.path.endsWith('.css')
            const isJS = output.kind === 'entry-point' || output.path.endsWith('.js')
            if ((requestedExt === 'css' && isCSS) || (requestedExt === 'js' && isJS)) {
              const text = await output.text()
              return requestedExt === 'css' ? css(text) : js(text)
            }
          }
        } else {
          console.error('Island build failed:', result.logs)
        }
      } catch (e) {
        console.error('Island build error:', e)
      }
      return new Response('Not found', { status: 404 })
    }

    // Static pages (auto-discover)
    const pages = await discoverPages()
    for (const name of pages) {
      const route = getPageRoute(name)
      if (path === route) {
        posts = await loadPosts()
        const Page = await loadPage(name)
        return html(createElement(Page, { posts }))
      }
    }

    // Blog posts
    const slug = path.slice(1)
    posts = await loadPosts()
    const currentPostSlugs = new Set(posts.map(p => p.slug))

    if (currentPostSlugs.has(slug)) {
      const result = await renderPost(slug)
      if (result) {
        // Re-bundle CSS modules before rendering to ensure fresh class names
        await initCSS()
        const cover = result.meta.cover ? await loadCover(result.meta.cover, slug) : null
        const PostPage = await loadPage('post')
        const element = createElement(PostPage, { meta: result.meta, children: result.content, cover })
        return html(element)
      }
    }

    // Serve post folder assets (for folder-based posts)
    const pathParts = path.slice(1).split('/')
    if (pathParts.length === 2) {
      const [postSlug, assetName] = pathParts
      const postAssetFile = Bun.file(`${POSTS_DIR}/${postSlug}/${assetName}`)
      if (await postAssetFile.exists()) {
        return new Response(postAssetFile)
      }
    }

    // Try public assets
    const file = Bun.file(`${PUBLIC_DIR}${path}`)
    if (await file.exists()) {
      return new Response(file)
    }

    // 404
    const NotFoundPage = await loadPage('404')
    return html(createElement(NotFoundPage), 404)
  }
})

console.log(`Dev server running at http://localhost:${PORT}`)
console.log(`Routes:`)
discoverPages().then(pages => {
  pages.forEach(name => console.log(`  ${getPageRoute(name)}`))
  posts.forEach(p => console.log(`  /${p.slug}`))
})
