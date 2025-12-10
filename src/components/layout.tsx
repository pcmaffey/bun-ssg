import type { ReactNode } from 'react'
import cx from 'classnames'
import { site } from '../config'
import { url } from '../core/utils'
import s from './layout.module.css'

export const layoutStyles = s

interface LayoutProps {
    title: string
    description?: string
    image?: string
    pageUrl?: string
    bodyClass?: string
    extraStyles?: string
    children: ReactNode
}

export function Layout({
    title,
    description = site.description,
    image = '/meta.png',
    pageUrl = site.url,
    bodyClass = '',
    extraStyles = '',
    children
}: LayoutProps) {
    const fullTitle = title === site.name ? title : `${title} | ${site.name}`
    const fullImage = image.startsWith('http') ? image : `${site.url}${image}`

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{fullTitle}</title>
                <meta name="description" content={description} />

                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:title" content={fullTitle} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={fullImage} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={fullTitle} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={fullImage} />

                {/* Favicon */}
                <link rel="icon" type="image/x-icon" href={url('/favicon.ico')} />
                <link rel="apple-touch-icon" href={url('/apple-touch-icon.png')} />
                <link rel="manifest" href={url('/manifest.webmanifest')} />

                {/* RSS */}
                <link rel="alternate" type="application/rss+xml" title={`${site.name} RSS Feed`} href={url('/rss.xml')} />

                {/* Styles */}
                <link rel="stylesheet" href={url('/styles.css')} />
                {extraStyles && <style dangerouslySetInnerHTML={{ __html: extraStyles }} />}
            </head>
            <body className={cx(s.layout, bodyClass)}>
                {children}
            </body>
        </html>
    )
}
