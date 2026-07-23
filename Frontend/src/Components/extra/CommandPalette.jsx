import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    FaSearch, FaPlus, FaHistory, FaComments, FaLayerGroup, FaUser, FaSun, FaMoon,
    FaChartLine, FaUsers, FaCreditCard,
} from 'react-icons/fa'
import useTheme from '../../Hooks/useTheme.js'

// pure frontend, no backend/API involved sir — a Cmd/Ctrl+K launcher over a fixed list of
// destinations + actions, filtered client-side. Role-gated the same way Navbar.jsx already
// gates Admin/Support/Billing links, so a plain User never sees Admin-only entries and vice versa.
const buildCommands = (role, toggleTheme, theme) => {
    const base = [
        { id: 'new-summary', label: 'New summary', icon: FaPlus, to: '/Dashboard/New-Summary', keywords: 'create summarize' },
        { id: 'history', label: 'History', icon: FaHistory, to: '/Dashboard/History', keywords: 'notes list' },
        { id: 'review', label: 'Review', icon: FaLayerGroup, to: '/Dashboard/Review', keywords: 'flashcards spaced repetition' },
        { id: 'chats', label: 'Chats', icon: FaComments, to: '/Dashboard/Chats', keywords: 'chat ai' },
        { id: 'search', label: 'Search', icon: FaSearch, to: '/Dashboard/Search', keywords: 'find' },
        { id: 'account', label: 'Account', icon: FaUser, to: '/Dashboard/Account', keywords: 'profile settings billing password' },
        {
            id: 'theme', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
            icon: theme === 'dark' ? FaSun : FaMoon, action: toggleTheme, keywords: 'theme dark light appearance',
        },
    ]

    if (role === 'Admin') {
        base.push(
            { id: 'admin-overview', label: 'Admin overview', icon: FaChartLine, to: '/Admin', keywords: 'admin dashboard' },
            { id: 'admin-users', label: 'Admin users', icon: FaUsers, to: '/Admin/Users', keywords: 'admin ban role' },
            { id: 'admin-payments', label: 'Admin payments', icon: FaCreditCard, to: '/Admin/Payments', keywords: 'admin refund' },
        )
    } else if (role === 'Support' || role === 'Billing') {
        base.push(
            { id: 'support-overview', label: 'Support overview', icon: FaChartLine, to: '/Support', keywords: 'support dashboard' },
            { id: 'support-users', label: 'Support users', icon: FaUsers, to: '/Support/Users', keywords: 'support' },
            { id: 'support-payments', label: 'Support payments', icon: FaCreditCard, to: '/Support/Payments', keywords: 'support refund' },
        )
    }

    return base
}

const CommandPalette = () => {
    const navigate = useNavigate()
    const { token, user } = useSelector((state) => state.auth)
    const { theme, toggleTheme } = useTheme()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef(null)

    const commands = useMemo(() => buildCommands(user?.role, toggleTheme, theme), [user?.role, toggleTheme, theme])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return commands
        return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords?.includes(q))
    }, [commands, query])

    // activeIndex is reset to 0 wherever query/open actually change (see openPalette and the
    // input's onChange below) rather than synced via a separate effect sir — same result,
    // no cascading-render effect chain
    const clampedActiveIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0))

    // opens the dialog AND resets its transient state in one go sir — avoids a second effect
    // just to react to `open` flipping true
    const openPalette = () => {
        setQuery('')
        setActiveIndex(0)
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
    }

    // global Cmd/Ctrl+K sir — only wired up once a user is logged in, matches the search/
    // profile icons' own gating in Navbar.jsx (there's nothing useful to launch to logged out)
    useEffect(() => {
        if (!token) return
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setOpen((v) => {
                    if (v) return false
                    openPalette()
                    return true
                })
            }
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [token])

    const runCommand = (cmd) => {
        if (!cmd) return
        if (cmd.action) cmd.action()
        else if (cmd.to) navigate(cmd.to)
        setOpen(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            runCommand(filtered[clampedActiveIndex])
        }
    }

    if (!token || !open) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-richblack-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-surface-raised border border-border-soft rounded-lg shadow-2xl overflow-hidden"
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border-soft">
                    <FaSearch className="text-richblack-500 shrink-0" size={13} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
                        onKeyDown={handleKeyDown}
                        placeholder="Jump to..."
                        className="w-full bg-transparent text-richblack-5 text-sm outline-none placeholder:text-richblack-500"
                    />
                    <kbd className="text-richblack-500 text-xs border border-border-soft rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
                </div>

                <div className="max-h-80 overflow-y-auto py-1.5">
                    {filtered.length === 0 ? (
                        <p className="text-richblack-500 text-sm text-center py-8">No matches.</p>
                    ) : (
                        filtered.map((cmd, i) => (
                            <button
                                key={cmd.id}
                                onClick={() => runCommand(cmd)}
                                onMouseEnter={() => setActiveIndex(i)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${i === clampedActiveIndex ? 'bg-yellow-50/10 text-richblack-5' : 'text-richblack-200'}`}
                            >
                                <cmd.icon className={i === clampedActiveIndex ? 'text-yellow-50' : 'text-richblack-400'} size={13} />
                                <span className="text-sm">{cmd.label}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default CommandPalette
