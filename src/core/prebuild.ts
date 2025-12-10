// Pre-transform SVG files to TSX React components
// This avoids relying on Bun.plugin() transformation which doesn't work in all environments

import { transform } from '@svgr/core'

const ROOT_DIR = import.meta.dir.replace('/src/core', '')
const SRC_DIR = `${ROOT_DIR}/src`

export async function transformSVGs() {
  const glob = new Bun.Glob('**/*.svg')
  let count = 0
  
  for await (const file of glob.scan(SRC_DIR)) {
    const svgPath = `${SRC_DIR}/${file}`
    const tsxPath = svgPath + '.tsx'
    
    const svg = await Bun.file(svgPath).text()
    const code = await transform(svg, {
      plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
      jsxRuntime: 'automatic',
      exportType: 'default',
      typescript: true,
      svgoConfig: {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                // Keep viewBox for proper scaling
                removeViewBox: false,
              },
            },
          },
        ],
      },
    })
    
    await Bun.write(tsxPath, code)
    count++
  }
  
  return count
}

// Run if called directly
if (import.meta.main) {
  console.log('Transforming SVGs to TSX...')
  const count = await transformSVGs()
  console.log(`Transformed ${count} SVG files`)
}

