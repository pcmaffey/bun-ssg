import { site } from '../config'
import { Layout, layoutStyles, Link } from '../components'

export function AboutPage() {
    return (
        <Layout title="About" description={`About ${site.name}`}>
            <main className={layoutStyles.main}>
                <h1>About</h1>
                <p style={{ marginTop: '1rem' }}>
                    This is an example page. Pages in <code>src/pages/</code> are automatically
                    discovered and built as static HTML.
                </p>
                <p style={{ marginTop: '1rem' }}>
                    <Link href="/">Back to home</Link>
                </p>
            </main>
        </Layout>
    )
}
