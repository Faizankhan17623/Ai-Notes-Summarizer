import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function CitedAnswer({ content, citations = [] }) {
    const [selectedId, setSelectedId] = useState(null)
    const selected = citations.find(c => c.id === selectedId)
    return <>
        {content.split(/(\[S\d+\])/g).map((part, index) => {
            const source = citations.find(c => `[${c.id}]` === part)
            return source ? <button key={index} type="button"
                onClick={() => setSelectedId(selectedId === source.id ? null : source.id)}
                aria-expanded={selectedId === source.id}
                aria-label={`Show source ${source.id.slice(1)}: ${source.title}`}
                className="inline-block mx-1 px-1.5 rounded bg-yellow-50/10 text-yellow-50 font-semibold cursor-pointer">
                [{source.id.slice(1)}]
            </button> : <span key={index}>{part}</span>
        })}
        {selected && <aside className="mt-3 p-3 border border-yellow-50/30 rounded-lg bg-surface-raised whitespace-normal">
            <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{selected.title}{selected.page ? ` · Page ${selected.page}` : ''}</p>
                <button type="button" onClick={() => setSelectedId(null)} aria-label="Close source" className="text-richblack-400">✕</button>
            </div>
            <blockquote className="mt-2 whitespace-pre-wrap text-richblack-200 border-l-2 border-yellow-50 pl-3">{selected.excerpt}</blockquote>
            <p className="text-xs text-richblack-400 mt-2">Source passage saved with this answer. The current note may have changed.</p>
            <Link to={`/Dashboard/Note/${selected.note}`} className="inline-block text-yellow-50 text-xs mt-2 underline">Open current note</Link>
        </aside>}
    </>
}
