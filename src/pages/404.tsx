import { Layout, layoutStyles, Link } from '../components'

export function NotFoundPage() {
    return (
        <Layout title="404 - Page Not Found">
            <main className={layoutStyles.main} style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: 'var(--font-size-l4)', marginBottom: '1rem' }}>404</h1>
                <p>The page you're looking for doesn't exist.</p>
                <p style={{ marginTop: '1rem' }}>
                    <Link href="/">Go back home</Link>
                </p>
            </main>
        </Layout>
    )
}
