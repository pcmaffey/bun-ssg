import { site } from '../config'

/** Prefix a path with the site basePath. Handles leading slashes correctly. */
export function url(path: string): string {
    if (!site.basePath) return path
    // Skip external URLs and protocol handlers (http, https, mailto, tel, etc.)
    if (path.startsWith('http') || path.startsWith('//') || path.includes(':')) return path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${site.basePath}${normalizedPath}`
}

