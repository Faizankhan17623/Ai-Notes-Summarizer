import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FaHome, FaPlus, FaHistory, FaClipboardCheck, FaComments, FaUserCog, FaLink, FaLock, FaSearch, FaCalendarCheck, FaClipboardList, FaProjectDiagram, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import Navbar from '../Home/Navbar.jsx'
import AnimatedOutlet from '../extra/AnimatedOutlet.jsx'
import BannedNotice from './BannedNotice.jsx'
import ProductTour from './ProductTour.jsx'
import QuickActionsButton from './QuickActionsButton.jsx'
import { GetProfile } from '../../Services/operations/Auth.js'

// same 0.7/0.9 thresholds sir as the reactive credit-limit toast (see creditErrorToast.js) —
// bar turns warn/danger before the user actually gets blocked, not just after
const usageBarColor = (used, limit) => {
    if (limit === null) return 'bg-yellow-50'
    const pct = limit === 0 ? 1 : used / limit
    if (pct >= 0.9) return 'bg-danger-soft'
    if (pct >= 0.7) return 'bg-warn'
    return 'bg-yellow-50'
}

const UsageBar = ({ label, used, limit }) => (
    <div>
        <div className="flex justify-between text-xs text-richblack-400 mb-1.5">
            <span>{label}</span>
            <span className="font-mono">{limit === null ? 'Unlimited' : `${used} / ${limit}`}</span>
        </div>
        {limit !== null && (
            <div className="h-1.5 rounded-full bg-border-soft overflow-hidden">
                <div
                    className={`h-full rounded-full transition-colors duration-300 ${usageBarColor(used, limit)}`}
                    style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                />
            </div>
        )}
    </div>
)

const navItems = [
    { to: '/Dashboard', label: 'Overview', icon: FaHome, end: true },
    { to: '/Dashboard/New-Summary', label: 'New summary', icon: FaPlus, dataTour: 'new-summary' },
    { to: '/Dashboard/Articles', label: 'Articles', icon: FaLink },
    { to: '/Dashboard/History', label: 'All notes', icon: FaHistory, dataTour: 'history' },
    { to: '/Dashboard/Graph', label: 'Note graph', icon: FaProjectDiagram },
    { to: '/Dashboard/Search', label: 'Search', icon: FaSearch },
    { to: '/Dashboard/Review', label: 'Review queue', icon: FaClipboardCheck, dataTour: 'review' },
    { to: '/Dashboard/StudyPlan', label: 'Study plan', icon: FaCalendarCheck },
    { to: '/Dashboard/Exams', label: 'Practice exams', icon: FaClipboardList },
    { to: '/Dashboard/Chats', label: 'Chats', icon: FaComments, dataTour: 'chats' },
    { to: '/Dashboard/Account', label: 'Account', icon: FaUserCog },
]

// persistent sidebar shell for every logged-in page sir — wraps the private routes via
// an Outlet (see App.jsx), so Navbar + nav + the credits widget render exactly once
// instead of every page re-rendering its own copy
// key sir the collapse state is remembered under in localStorage — so it survives a reload/
// tab close instead of resetting to expanded every time
const SIDEBAR_COLLAPSED_KEY = 'notewise-sidebar-collapsed'

const DashboardLayout = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { plan, profile } = useSelector((state) => state.profile)
    const isBanned = !!user?.isBanned
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
        } catch {
            return false
        }
    })

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
            } catch {
                // localStorage can throw in private-browsing/blocked-storage contexts sir —
                // the toggle still works for the session, it just won't persist
            }
            return next
        })
    }

    // fresh ban/appeal status on every dashboard load sir — not just right after login. This
    // is what lets a user's "pending" appeal actually flip to "denied" in their own view once
    // an admin reviews it, without them needing to log out and back in first.
    useEffect(() => {
        dispatch(GetProfile(token))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            {!isBanned && profile && !profile.hasCompletedOnboarding && <ProductTour token={token} />}
            <Navbar showMegaMenu />
            <div className="flex">
                <aside className={`hidden md:flex flex-col shrink-0 border-r border-border-soft bg-surface-raised px-3 py-5 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto scrollbar-thin transition-[width] duration-200
                    ${collapsed ? 'w-16 items-center' : 'w-56'}`}>
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={`flex items-center justify-center w-7 h-7 rounded-md text-richblack-400 hover:text-richblack-5 hover:bg-surface-hover transition-colors mb-3 shrink-0
                            ${collapsed ? '' : 'self-end'}`}
                    >
                        {collapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
                    </button>

                    <nav className="flex flex-col gap-1 w-full">
                        {navItems.map(({ to, label, icon: Icon, end, dataTour }) => (
                            isBanned ? (
                                // locked sir — no href/onClick at all, just a visual list with a
                                // lock icon in place of the usual nav icon, nothing here is clickable
                                <span
                                    key={to}
                                    aria-disabled="true"
                                    title="Locked while your account is suspended"
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-richblack-500 cursor-not-allowed select-none
                                        ${collapsed ? 'justify-center' : ''}`}
                                >
                                    <FaLock className="w-4 h-4 opacity-60 shrink-0" />
                                    {!collapsed && label}
                                </span>
                            ) : (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    data-tour={dataTour}
                                    title={collapsed ? label : undefined}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive ? 'bg-yellow-50/10 text-richblack-5 font-semibold' : 'text-richblack-300 hover:bg-surface-hover hover:text-richblack-5'}`
                                    }
                                >
                                    <Icon className="w-4 h-4 opacity-80 shrink-0" />
                                    {!collapsed && label}
                                </NavLink>
                            )
                        ))}
                    </nav>

                    {!isBanned && plan && !collapsed && (
                        <div data-tour="credits" className="mt-auto border border-border-soft rounded-lg p-3 bg-surface space-y-3 w-full">
                            <UsageBar label="Credits" used={plan.creditsUsed} limit={plan.creditsLimit} />

                            {plan.creditsLimit !== null && plan.creditsUsed / plan.creditsLimit >= 0.9 && (
                                <p className="text-xs text-danger-soft leading-snug">
                                    Almost out of credits —{' '}
                                    <Link to="/Pricing" className="underline hover:text-danger-soft/80">
                                        upgrade or top up
                                    </Link>
                                </p>
                            )}

                            {plan.features && [
                                ['Document summaries', plan.features.docSummary],
                                ['Bulk uploads', plan.features.bulkSummary],
                                ['Audio summaries', plan.features.audioSummary],
                            ].map(([label, usage]) => usage && (
                                <UsageBar key={label} label={label} used={usage.used} limit={usage.limit} />
                            ))}

                            <p className="text-xs text-richblack-400">{plan.name} plan</p>
                        </div>
                    )}
                </aside>

                <main className="flex-1 min-w-0">
                    {isBanned ? <BannedNotice user={user} /> : <AnimatedOutlet />}
                </main>
            </div>

            {!isBanned && <QuickActionsButton />}
        </div>
    )
}

export default DashboardLayout
