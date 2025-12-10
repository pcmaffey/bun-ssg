import cx from 'classnames'
import { site } from '../config'
import { Link } from './link'
import { Logo } from './logo'
import { Tag } from './tag'
import s from './about.module.css'

interface AboutProps {
    className?: string
}

export function About({ className }: AboutProps) {
    return (
        <div className={cx(s.about, 'column', className)}>
            <Link href="/" className={s.logo}><Logo /></Link>
            <p>{site.description}</p>
            <div className={cx(s.tags)}>
                <Tag>Email: <Link href={`mailto:${site.email}`}>{site.email}</Link></Tag>
                <Tag>Follow: <Link href="/rss.xml">rss.xml</Link></Tag>
            </div>
        </div>
    )
}
