// Directory paths
const ROOT_DIR = import.meta.dir.replace('/src/core', '')
const CACHE_DIR = `${ROOT_DIR}/.cache`
const CSS_MODULES_CACHE = `${CACHE_DIR}/css-modules.json`

// Find all CSS module files
async function findCSSModules(): Promise<string[]> {
  const glob = new Bun.Glob('**/*.module.css')
  const files: string[] = []
  for await (const file of glob.scan(`${ROOT_DIR}/src`)) {
    files.push(`${ROOT_DIR}/src/${file}`)
  }
  return files
}

// Bundle CSS modules: writes mappings to .cache/css-modules.json and returns combined CSS
export async function bundlePageCSS(minify: boolean): Promise<string> {
  const cssModuleFiles = await findCSSModules()
  const allMappings: Record<string, Record<string, string>> = {}
  let combinedCSS = ''
  
  await Bun.$`mkdir -p ${CACHE_DIR}`.quiet()
  
  for (const cssPath of cssModuleFiles) {
    // Create wrapper that imports and exports the CSS module
    const wrapperCode = `import styles from '${cssPath}'; export { styles };`
    const wrapperPath = `${CACHE_DIR}/css-extract-${Date.now()}.ts`
    await Bun.write(wrapperPath, wrapperCode)
    
    const result = await Bun.build({
      entrypoints: [wrapperPath],
      minify,
    })
    
    if (result.success) {
      for (const output of result.outputs) {
        if (output.path.endsWith('.css')) {
          combinedCSS += await output.text() + '\n'
        } else if (output.path.endsWith('.js')) {
          // Extract the styles object (handles both minified and non-minified output)
          const jsCode = await output.text()
          const match = jsCode.match(/var \w+=({[\s\S]*?});/) || jsCode.match(/var \w+ = ({[\s\S]*?});/)
          if (match) {
            const objStr = match[1]
              .replace(/(\w+):/g, '"$1":')
              .replace(/'/g, '"')
            const styles = JSON.parse(objStr)
            allMappings[cssPath] = styles
          }
        }
      }
    }
  }
  
  // Write all mappings to cache file
  await Bun.write(CSS_MODULES_CACHE, JSON.stringify(allMappings, null, 2))
  
  return combinedCSS
}
