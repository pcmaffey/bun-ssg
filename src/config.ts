// =============================================================================
// Site Configuration
// =============================================================================

export const site = {
    name: 'Bun SSG',
    url: 'https://pcmaffey.github.io',
    /** Base path for GitHub Pages or subdirectory hosting (e.g. '/bun-ssg'). Leave empty for root hosting. */
    basePath: '/bun-ssg',
    description: 'A static site generator built with Bun and React',
    author: 'Your Name',
    email: 'hello@example.com',
} as const

export const rss = {
    title: site.name,
    description: site.description,
} as const
