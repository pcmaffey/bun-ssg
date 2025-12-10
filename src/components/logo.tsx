import cx from 'classnames'
import { site } from '../config'
import LogoSvg from '../assets/logo.svg'
import s from './logo.module.css'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cx(s.logo, className)}>
      <span className={s.icon}>
        <LogoSvg />
      </span>
      <span className={s.name}>{site.name}</span>
    </div>
  )
}
