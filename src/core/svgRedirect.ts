// Simple Bun plugin that redirects .svg imports to .svg.tsx
// The actual transformation is done by prebuild.ts
// This just handles module resolution so we can import './file.svg' instead of './file.svg.tsx'

import { plugin } from 'bun'
import { resolve, dirname } from 'path'

export function registerSvgRedirect() {
  plugin({
    name: 'svg-redirect',
    setup(build) {
      build.onResolve({ filter: /\.svg$/ }, (args) => {
        // Resolve relative to importer, append .tsx
        const dir = args.importer ? dirname(args.importer) : process.cwd()
        const tsxPath = resolve(dir, args.path + '.tsx')
        return { path: tsxPath }
      })
    },
  })
}

// Auto-register when imported (for bunfig.toml preload)
registerSvgRedirect()

