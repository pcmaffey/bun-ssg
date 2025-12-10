import { spawn, type Subprocess } from 'bun'
import { watch } from 'node:fs'
import { transformSVGs } from './prebuild'

const ROOT_DIR = import.meta.dir.replace('/src/core', '')
const SRC_DIR = `${ROOT_DIR}/src`
const DEV_SERVER_URL = 'http://localhost:3100'

// Any TypeScript file change requires restart (Bun caches modules)
function requiresRestart(relativePath: string): boolean {
  // Ignore generated .svg.tsx files
  if (relativePath.endsWith('.svg.tsx')) return false
  return /\.(ts|tsx)$/.test(relativePath)
}

let serverProcess: Subprocess | null = null
let isRestarting = false

async function startServer(): Promise<void> {
  console.log('Starting dev server...')
  serverProcess = spawn({
    cmd: ['bun', 'run', `${SRC_DIR}/core/dev.ts`],
    cwd: ROOT_DIR,
    stdout: 'inherit',
    stderr: 'inherit'
  })
}

async function stopServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill()
    await serverProcess.exited
    serverProcess = null
  }
}

async function restartServer(): Promise<void> {
  if (isRestarting) return
  isRestarting = true
  
  console.log('\nRestarting server...')
  await stopServer()
  await startServer()
  
  // Wait for server to be ready before signaling reload
  await waitForServer()
  await triggerReload()
  
  isRestarting = false
}

async function waitForServer(maxAttempts = 50): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${DEV_SERVER_URL}/__health__`)
      if (res.ok) return
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(100)
  }
  console.warn('Server did not become ready in time')
}

async function triggerReload(): Promise<void> {
  try {
    await fetch(`${DEV_SERVER_URL}/__reload__`, { method: 'POST' })
  } catch (e) {
    console.error('Failed to trigger reload:', e)
  }
}

// Debounce file changes
let debounceTimer: Timer | null = null
const pendingChanges = new Set<string>()

async function handleFileChange(relativePath: string): Promise<void> {
  // Handle SVG changes - regenerate TSX
  if (relativePath.endsWith('.svg')) {
    console.log(`\nSVG changed: ${relativePath}`)
    await transformSVGs()
    await restartServer()
    return
  }
  
  // Ignore non-source files and generated files
  if (!relativePath.match(/\.(ts|tsx|mdx|css)$/)) return
  if (relativePath.endsWith('.svg.tsx') || relativePath.endsWith('.d.svg.ts')) return
  
  pendingChanges.add(relativePath)
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(async () => {
    const changes = [...pendingChanges]
    pendingChanges.clear()
    
    const needsRestart = changes.some(requiresRestart)
    
    if (needsRestart) {
      await restartServer()
    } else {
      // Content-only change (MDX, CSS, islands) - just reload browser
      console.log(`\nFile changed: ${changes.join(', ')}`)
      await triggerReload()
    }
  }, 150)
}

// Start
console.log('Dev runner started')

// Transform SVGs before starting server
console.log('Transforming SVGs...')
const count = await transformSVGs()
console.log(`Transformed ${count} SVG files`)
console.log('Watching for file changes...\n')

await startServer()

// Use recursive watch on src directory
watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
  if (filename) {
    handleFileChange(filename)
  }
})

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await stopServer()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await stopServer()
  process.exit(0)
})

