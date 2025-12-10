import { createElement } from 'react'

// Path string for default exports, or [path, exportName] tuple for named exports
type IslandPath = string | [path: string, exportName: string]
type IslandConfig = Record<string, IslandPath>

interface IslandRegistry<T extends IslandConfig> {
    paths: T
    placeholders: { [K in keyof T as Capitalize<string & K>]: () => JSX.Element }
}

/**
 * Define islands with a single configuration object.
 * Keys are island names (lowercase), values are paths relative to src/.
 * 
 * For default exports, use a string path.
 * For named exports, use a tuple: [path, exportName]
 * 
 * @example
 * const islands = defineIslands({
 *     counter: 'components/counter.tsx',                    // default export
 *     chart: ['components/charts.tsx', 'PieChart'],         // named export
 * })
 * 
 * export const { Counter, Chart } = islands.placeholders
 */
export function defineIslands<T extends IslandConfig>(config: T): IslandRegistry<T> {
    const placeholders = {} as IslandRegistry<T>['placeholders']
    
    for (const name of Object.keys(config)) {
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1) as Capitalize<string & keyof T>
        placeholders[capitalizedName] = () => createElement('div', { 'data-island': name })
    }
    
    return {
        paths: config,
        placeholders,
    }
}

/** Get the file path from an island config entry */
export function getIslandPath(entry: IslandPath): string {
    return Array.isArray(entry) ? entry[0] : entry
}

/** Get the export name from an island config entry (undefined = default export) */
export function getIslandExport(entry: IslandPath): string | undefined {
    return Array.isArray(entry) ? entry[1] : undefined
}
