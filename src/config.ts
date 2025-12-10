// =============================================================================
// Site Configuration
// =============================================================================

export const site = {
    name: 'Bun SSG',
    url: 'https://example.com',
    description: 'A static site generator built with Bun and React',
    author: 'Your Name',
    email: 'hello@example.com',
} as const

export const rss = {
    title: site.name,
    description: site.description,
} as const
