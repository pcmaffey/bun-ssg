import cx from 'classnames'
import s from './code.module.css'
import { Fragment, ReactNode } from 'react'

export function Code({ nowrap = false, children, ...props }: React.HTMLAttributes<HTMLElement> & { nowrap?: boolean }) {
  return <code className={cx(s.code, nowrap && s.nowrap)} {...props}>{children}</code>
}

export function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement> & { className?: string }) {
  const code = typeof children === 'string' ? formatCode(children) : children
  return (
    <code className={cx(s.codeBlock, className)} {...props}>
      {code}
    </code>
  )
}

function formatStrings(code: string, k?: string): ReactNode {
  if (!code) return null
  const c = code.split(/('.*?')/)
  if (c.length === 1) return code

  return (
    <Fragment key={k}>
      {c.map((l, i) => {
        if (l.substring(0, 1) === "'") {
          return (
            <span key={`string-${i}`} className={s.string}>
              {l}
            </span>
          )
        }
        return l
      })}
    </Fragment>
  )
}

function formatCode(code: string): ReactNode {
  if (!code) return null
  const c = code.split(/(\/\*.*?\*\/)/)
  if (c.length === 1) return formatStrings(code)

  return c.map((l, i) => {
    if (l.substring(0, 2) === '/*') {
      return (
        <span key={`comment-${i}`} className={s.comment}>
          {l.substring(2, l.length - 2)}
        </span>
      )
    }
    return formatStrings(l, String(i))
  })
}




