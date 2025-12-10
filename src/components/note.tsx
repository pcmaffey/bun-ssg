import type { ReactNode } from 'react'
import s from './note.module.css'

interface NoteTriggerProps {
    id: string
    children: ReactNode
}

export function Note({ id, children }: NoteTriggerProps) {
    return <label className={s.trigger} htmlFor={`note-${id}`}>{children}</label>
}

interface NoteContentProps {
    id: string
    children: ReactNode
}

export function NoteContent({ id, children }: NoteContentProps) {
    return (
        <>
            <input type="checkbox" id={`note-${id}`} className={s.toggle} />
            <div className={s.content}>{children}</div>
        </>
    )
}
