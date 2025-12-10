import type { PostMeta } from '../core/types'
import { Link } from './link'
import s from './post-list.module.css'

interface PostListProps {
    posts: PostMeta[]
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export function PostList({ posts }: PostListProps) {
    if (posts.length === 0) {
        return (
            <div className={s.empty}>
                <p>No posts yet. Create your first post in <code>src/posts/</code></p>
            </div>
        )
    }

    return (
        <ul className={s.list}>
            {posts.map(post => (
                <li key={post.slug} className={s.item}>
                    <Link href={`/${post.slug}`} className={s.link}>
                        <span className={s.title}>{post.title}</span>
                        {post.subtitle && <span className={s.subtitle}>{post.subtitle}</span>}
                        <time className={s.date} dateTime={new Date(post.publishedAt).toISOString()}>
                            {formatDate(post.publishedAt)}
                        </time>
                    </Link>
                </li>
            ))}
        </ul>
    )
}


