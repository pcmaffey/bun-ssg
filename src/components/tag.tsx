import type { ReactNode } from 'react'
import cx from 'classnames'
import s from './tag.module.css'

interface TagProps {
  className?: string
  children: ReactNode
}

export function Tag({ className, children }: TagProps) {
  return <span className={cx(s.tag, className)}>{children}</span>
}




