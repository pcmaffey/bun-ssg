import { useState } from 'react'
import s from './counter.module.css'

export default function Counter() {
    const [count, setCount] = useState(0)

    return (
        <div className={s.counter}>
            <button 
                className={s.button} 
                onClick={() => setCount(c => c - 1)}
                aria-label="Decrease count"
            >
                -
            </button>
            <span className={s.count}>{count}</span>
            <button 
                className={s.button} 
                onClick={() => setCount(c => c + 1)}
                aria-label="Increase count"
            >
                +
            </button>
        </div>
    )
}


