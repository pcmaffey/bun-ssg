import type { ReactNode } from 'react'
import { site } from '../config'
import { Layout, Link, About, Tag } from '../components'
import type { PostMeta } from '../core/types'
import styles from './post.module.css'

function parseMarkdownLinks(text: string): ReactNode[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts: ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index))
        }
        parts.push(
            <Link key={match.index} href={match[2]}>
                {match[1]}
            </Link>
        )
        lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
    }

    return parts
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

interface PostPageProps {
    meta: PostMeta
    children: ReactNode
    cover?: ReactNode
}

export function PostPage({ meta, children, cover }: PostPageProps) {
    const headerClass = cover
        ? styles.header
        : `${styles.header} ${styles.headerNoCover}`
    return (
        <Layout
            title={meta.title}
            description={meta.subtitle || meta.description || ''}
            image={meta.image}
            pageUrl={`${site.url}/${meta.slug}`}
        >
            <article className={styles.post}>
                <header className={headerClass}>
                    <div className={styles.words}>
                        <div className={styles.titleBox}>
                            <h1 className={styles.title}>{meta.title}</h1>
                            {meta.subtitle && <p className={styles.subtitle}>{meta.subtitle}</p>}
                        </div>
                        {meta.description && <hr className={styles.divider} />}
                        <div className={styles.aboutBox}>
                            {meta.description && (
                                <p className={styles.description}>{parseMarkdownLinks(meta.description)}</p>
                            )}
                            <p><Tag>
                                <time dateTime={new Date(meta.publishedAt).toISOString()}>
                                    Published {formatDate(meta.publishedAt)}
                                </time>
                            </Tag></p>
                            <p className={styles.byline}><Link href="/">By {site.author}</Link></p>
                        </div>
                    </div>
                    {cover && <div className={styles.cover}>{cover}</div>}
                </header>
                <div className={styles.content}>
                    {children}
                </div>
                <footer className={styles.footer}>
                    <About />
                </footer>
            </article>
        </Layout>
    )
}
