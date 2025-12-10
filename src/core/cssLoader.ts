// Bun plugin to handle CSS module imports
// Returns a Proxy that reads fresh from .cache/css-modules.json on each access

const ROOT_DIR = import.meta.dir.replace('/src/core', '')
const CSS_MODULES_CACHE = `${ROOT_DIR}/.cache/css-modules.json`

Bun.plugin({
  name: 'css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css/ }, (args) => {
      // Strip query string from path for cache lookup
      const cleanPath = args.path.split('?')[0]
      
      // Return a Proxy that reads fresh values on each property access (for HMR)
      return {
        contents: `
          const fs = require('fs');
          const cachePath = ${JSON.stringify(CSS_MODULES_CACHE)};
          const filePath = ${JSON.stringify(cleanPath)};
          
          export default new Proxy({}, {
            get(_, prop) {
              if (prop === '__esModule') return true;
              try {
                const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
                return (cache[filePath] || {})[prop];
              } catch {
                return undefined;
              }
            },
            ownKeys() {
              try {
                const fs = require('fs');
                const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
                return Object.keys(cache[filePath] || {});
              } catch {
                return [];
              }
            },
            getOwnPropertyDescriptor(_, prop) {
              return { configurable: true, enumerable: true, value: this.get(_, prop) };
            }
          });
        `,
        loader: 'js',
      }
    })
  },
})

