import { site } from '../config'
import { Layout, layoutStyles, About, PostList, Link } from '../components'
import type { PostMeta } from '../core/types'

export function IndexPage({ posts }: { posts: PostMeta[] }) {
    return (
        <Layout title={site.name}>
            <main className={layoutStyles.main}>
                <About />
                <nav style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link href="/about">About</Link>
                </nav>
                <div style={{ marginTop: '3rem' }}>
                    <PostList posts={posts} />
                </div>
            </main>
        </Layout>
    )
}
