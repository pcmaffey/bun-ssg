import cx from 'classnames'
import { url } from '../core/utils'
import s from './link.module.css'

export function Link({ href, className, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isExternal = href?.startsWith('http') || href?.startsWith('//')
  const resolvedHref = href && !isExternal ? url(href) : href

  return (
    <a
      href={resolvedHref}
      className={cx(s.link, className)}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      title={isExternal ? `Open in new tab: ${href}` : undefined}
    >
      {children}
    </a>
  )
}




