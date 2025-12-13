# Bun SSG

A fast, minimal static site generator built with Bun and React islands. Features MDX support and an islands architecture for selective client-side interactivity. Outputs ~10KB of HTML+CSS, with no javascript dependencies loaded until needed.

## Features

- Fast minimal builds
- Automatic page routing and RSS feed generation
- MDX for markdown content with JSX components
- Islands architecture for interactive components
- CSS modules for scoped styling
- Import SVGs as React components
- Hot reloading
- TypeScript throughout
- No client-side routing

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run serve
```

## Project Structure

```
src/
  config.ts          # Site configuration (name, URL, etc.)
  registry.ts        # Island and MDX component registry
  assets/            # SVGs (auto-converted to React components)
  components/        # React components
  core/              # Build system
  pages/             # Page templates
  posts/             # MDX content
  styles/            # Global CSS
public/              # Static files (favicon, icons, etc.)
dist/                # Build output
```

## Configuration

Edit `src/config.ts` to customize your site:

```typescript
export const site = {
  name: 'My Site',
  url: 'https://example.com',
  basePath: '/my-repo', // For GitHub Pages or subdirectory hosting (leave empty for root)
  description: 'My site description',
  author: 'Your Name',
  email: 'hello@example.com',
}

export const rss = {
  title: site.name,
  description: site.description,
}
```

## Creating Posts

Posts are MDX files in `src/posts/`. Create either:

1. A standalone file: `src/posts/my-post.mdx`
2. A folder with assets: `src/posts/my-post/index.mdx`

### Frontmatter

Each post needs frontmatter:

```yaml
---
title: "Post Title"
slug: "post-slug"
subtitle: "Optional subtitle"
description: "SEO description"
image: "/path/to/og-image.png"
cover: "cover.svg"
publishedAt: "2024-01-01"
updatedAt: "2024-01-02"
---
```

Required fields: `title`, `slug`, `publishedAt`

### Using Components

Built-in components are available in MDX:

```mdx

<Note id="my-note">Clickable note trigger</Note>
<NoteContent id="my-note">
Expandable note content.
</NoteContent>

```

## Components

| Component              | Description                |
| ---------------------- | -------------------------- |
| `Note` / `NoteContent` | Expandable inline notes    |
| `Code` / `CodeBlock`   | Code formatting            |
| `Link`                 | Styled anchor links        |
| `Tag`                  | Small labels               |
| `Layout`               | Page layout with meta tags |
| `PostList`             | List of posts              |
| `About`                | Site intro section         |
| `Logo`                 | Site logo                  |

## Islands Architecture

Islands are interactive React components that hydrate on the client while the rest of the page remains static HTML.

### Creating an Island

1. Create the component in `src/components/`:

```tsx
// src/components/counter.tsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

2. Register in `src/registry.ts`:

```typescript
import { defineIslands } from './core/islands'

const islands = defineIslands({
    counter: 'components/counter.tsx',                  // default export
    chart: ['components/charts.tsx', 'PieChart'],       // named export
})

export const islandPaths = islands.paths
export const { Counter, Chart } = islands.placeholders
```

3. Use in MDX:

```mdx
Here's an interactive counter:

<Counter />
```

### How It Works

1. During SSR, islands render as `<div data-island="name">`
2. The build detects these markers and bundles the island's JS/CSS
3. On the client, islands hydrate with React
4. React is loaded once from CDN and shared across all islands

Islands are only loaded on pages that use them, keeping bundle sizes minimal.

## SVG Imports

SVGs in `src/assets/` are automatically converted to React components during build. Import them directly:

```tsx
import ArrowIcon from '../assets/arrow.svg'

function MyComponent() {
  return <ArrowIcon className="icon" />
}
```

SVGs use `currentColor` for fills/strokes, so they inherit text color. The prebuild step transforms `.svg` files to `.svg.tsx` components.

**Note:** Use `src/assets/` for SVGs that need `currentColor` or React props. Use `public/` for static images loaded via `<img>` tags.

## Styling

### CSS Variables

Customize the theme in `src/styles/global.css`:

```css
:root {
  /* Colors */
  --color-primary: #22c55e;
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-text: #171717;
  --color-muted: #737373;
  --color-border: #e5e5e5;
  
  /* Typography */
  --font-sans: system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
  
  /* Layout */
  --column-width: 42rem;
  --border-radius: 4px;
}
```

Dark mode automatically applies via `prefers-color-scheme: dark`.

### CSS Modules

Components use CSS modules for scoped styles:

```tsx
import s from './my-component.module.css'

export function MyComponent() {
  return <div className={s.container}>...</div>
}
```

## Pages

Static pages live in `src/pages/`. The build system auto-discovers them:

- `index.tsx` -> `/`
- `404.tsx` -> `/404.html`
- `about.tsx` -> `/about/`

Page components receive `{ posts }` as props.

## Build System

The build process:

1. Bundles CSS modules
2. Copies public assets
3. Loads and processes MDX posts
4. Renders static pages
5. Detects and bundles islands
6. Generates RSS feed

Output goes to `dist/`.

## Development

```bash
bun run dev
```

The dev server watches for changes and rebuilds automatically.

### Hot Reloading

The dev server uses a two-process architecture:

1. **`dev-runner.ts`** watches `src/` for file changes
2. **`dev.ts`** serves content and maintains SSE connections with browsers

When files change:

- **TypeScript/TSX** → Full server restart (Bun caches modules)
- **MDX/CSS** → Browser reload only (faster, no restart needed)
- **SVG** → Regenerate TSX wrappers, then restart

The browser connects via Server-Sent Events (`/__dev__`) and reloads when notified. If the server restarts, the browser automatically reconnects and reloads once it's ready.

## Deployment

Build the site:

```bash
bun run build
```

Deploy the `dist/` folder to any static host:
- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

## License

MIT

