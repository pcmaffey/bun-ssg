import cx from 'classnames'
import s from './link.module.css'

export function Link({ href, className, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isExternal = href?.startsWith('http') || href?.startsWith('//')

  return (
    <a
      href={href}
      className={cx(s.link, className)}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      title={isExternal ? `Open in new tab: ${href}` : undefined}
    >
      {children}
    </a>
  )
}




