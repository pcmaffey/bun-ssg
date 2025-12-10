import { defineIslands } from './core/islands'
import * as components from './components'

// =============================================================================
// Island Registry
// =============================================================================

// These are interactive React components that hydrate on the client
const islands = defineIslands({
    counter: 'components/counter.tsx',
})

export const islandPaths = islands.paths
export const { Counter } = islands.placeholders

// =============================================================================
// MDX Components
// =============================================================================

export const mdxComponents = {
    // HTML element overrides
    a: components.Link,
    code: components.Code,
    pre: components.CodeBlock,
    ...components,
    ...islands.placeholders,

}

