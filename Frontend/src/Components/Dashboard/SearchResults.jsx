import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaSearch, FaFileAlt, FaComments, FaLayerGroup, FaClipboardCheck } from 'react-icons/fa'
import { SearchAll } from '../../Services/operations/Search.js'

const ResultGroup = ({ title, icon: Icon, items, renderRow, emptyLabel }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-5">
        <h2 className="flex items-center gap-2 text-richblack-5 font-semibold mb-3">
            <Icon size={14} className="text-yellow-50" /> {title}
        </h2>
        {items.length === 0 ? (
            <p className="text-richblack-400 text-sm">{emptyLabel}</p>
        ) : (
            <div className="space-y-2">{items.map(renderRow)}</div>
        )}
    </div>
)

const ResultRow = ({ to, primary, secondary }) => (
    <Link
        to={to}
        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-surface-hover transition-colors"
    >
        <div className="min-w-0">
            <p className="text-richblack-5 text-sm truncate">{primary}</p>
            {secondary && <p className="text-richblack-400 text-xs truncate mt-0.5">{secondary}</p>}
        </div>
    </Link>
)

// unified search across Notes/Chats/Flashcards/Quizzes sir — Notes already had its own
// search on History.jsx, this is the "find that one thing regardless of which feature it's
// in" page, debounced the same 300ms as History.jsx's search
const SearchResults = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { results, loading } = useSelector((state) => state.search)
    const [searchParams, setSearchParams] = useSearchParams()
    const [query, setQuery] = useState(searchParams.get('q') || '')

    useEffect(() => {
        const handle = setTimeout(() => {
            if (query.trim()) {
                setSearchParams({ q: query.trim() })
                dispatch(SearchAll(query.trim(), token))
            }
        }, 300)
        return () => clearTimeout(handle)
    }, [dispatch, token, query, setSearchParams])

    const hasQuery = query.trim().length > 0
    const totalResults = results.notes.length + results.chats.length + results.flashcards.length + results.quizzes.length

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <Helmet><title>Search — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Search</h1>

            <div className="relative mb-6">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-500" size={13} />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes, chats, flashcards, quizzes..."
                    className="w-full bg-surface border border-border-soft text-richblack-5 rounded-md pl-9 pr-4 py-2.5 outline-none focus:border-yellow-50 transition-colors"
                />
            </div>

            {!hasQuery ? (
                <p className="text-richblack-400 text-sm text-center py-16">Start typing to search everything you've created.</p>
            ) : loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : totalResults === 0 ? (
                <p className="text-richblack-400 text-sm text-center py-16">No results for &quot;{query}&quot;.</p>
            ) : (
                <div className="space-y-4">
                    <ResultGroup
                        title="Notes"
                        icon={FaFileAlt}
                        items={results.notes}
                        emptyLabel="No matching notes."
                        renderRow={(n) => (
                            <ResultRow
                                key={n._id}
                                to={`/Dashboard/Note/${n._id}`}
                                primary={n.title}
                                secondary={new Date(n.createdAt).toLocaleDateString()}
                            />
                        )}
                    />
                    <ResultGroup
                        title="Chats"
                        icon={FaComments}
                        items={results.chats}
                        emptyLabel="No matching chats."
                        renderRow={(c) => (
                            <ResultRow
                                key={c._id}
                                to={`/Dashboard/Chat/${c._id}`}
                                primary={c.title}
                                secondary={new Date(c.createdAt).toLocaleDateString()}
                            />
                        )}
                    />
                    <ResultGroup
                        title="Flashcards"
                        icon={FaLayerGroup}
                        items={results.flashcards}
                        emptyLabel="No matching flashcards."
                        renderRow={(f) => (
                            <ResultRow
                                key={f._id}
                                to={`/Dashboard/Note/${f.note}`}
                                primary={f.front}
                                secondary={f.back}
                            />
                        )}
                    />
                    <ResultGroup
                        title="Quizzes"
                        icon={FaClipboardCheck}
                        items={results.quizzes}
                        emptyLabel="No matching quizzes."
                        renderRow={(q) => (
                            <ResultRow
                                key={q._id}
                                to={`/Dashboard/Note/${q.note}`}
                                primary={q.preview}
                                secondary={new Date(q.createdAt).toLocaleDateString()}
                            />
                        )}
                    />
                </div>
            )}
        </div>
    )
}

export default SearchResults
