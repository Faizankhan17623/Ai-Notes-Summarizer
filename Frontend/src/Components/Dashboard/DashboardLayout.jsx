import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FaHome, FaPlus, FaHistory, FaClipboardCheck, FaComments, FaUserCog, FaLink, FaLock } from 'react-icons/fa'
import Navbar from '../Home/Navbar.jsx'
import AnimatedOutlet from '../extra/AnimatedOutlet.jsx'
import BannedNotice from './BannedNotice.jsx'
import { GetProfile } from '../../Services/operations/Auth.js'

const navItems = [
    { to: '/Dashboard', label: 'Overview', icon: FaHome, end: true },
    { to: '/Dashboard/New-Summary', label: 'New summary', icon: FaPlus },
    { to: '/Dashboard/Articles', label: 'Articles', icon: FaLink },
    { to: '/Dashboard/History', label: 'All notes', icon: FaHistory },
    { to: '/Dashboard/Review', label: 'Review queue', icon: FaClipboardCheck },
    { to: '/Dashboard/Chats', label: 'Chats', icon: FaComments },
    { to: '/Dashboard/Account', label: 'Account', icon: FaUserCog },
]

// persistent sidebar shell for every logged-in page sir — wraps the private routes via
// an Outlet (see App.jsx), so Navbar + nav + the credits widget render exactly once
// instead of every page re-rendering its own copy
const DashboardLayout = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { plan } = useSelector((state) => state.profile)
    const isBanned = !!user?.isBanned

    // fresh ban/appeal status on every dashboard load sir — not just right after login. This
    // is what lets a user's "pending" appeal actually flip to "denied" in their own view once
    // an admin reviews it, without them needing to log out and back in first.
    useEffect(() => {
        dispatch(GetProfile(token))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, token])

    return (
        <div className="min-h-screen bg-richblack-900">
            <Navbar />
            <div className="flex">
                <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border-soft bg-surface-raised px-3 py-5 min-h-[calc(100vh-73px)]">
                    <nav className="flex flex-col gap-1">
                        {navItems.map(({ to, label, icon: Icon, end }) => (
                            isBanned ? (
                                // locked sir — no href/onClick at all, just a visual list with a
                                // lock icon in place of the usual nav icon, nothing here is clickable
                                <span
                                    key={to}
                                    aria-disabled="true"
                                    title="Locked while your account is suspended"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-richblack-500 cursor-not-allowed select-none"
                                >
                                    <FaLock className="w-4 h-4 opacity-60" />
                                    {label}
                                </span>
                            ) : (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors
                                        ${isActive ? 'bg-yellow-50/10 text-richblack-5 font-semibold' : 'text-richblack-300 hover:bg-surface-hover hover:text-richblack-5'}`
                                    }
                                >
                                    <Icon className="w-4 h-4 opacity-80" />
                                    {label}
                                </NavLink>
                            )
                        ))}
                    </nav>

                    {!isBanned && plan && (
                        <div className="mt-auto border border-border-soft rounded-lg p-3 bg-surface space-y-3">
                            <div>
                                <div className="flex justify-between text-xs text-richblack-400 mb-1.5">
                                    <span>Credits</span>
                                    <span className="font-mono">{plan.creditsLimit === null ? 'Unlimited' : `${plan.creditsUsed} / ${plan.creditsLimit}`}</span>
                                </div>
                                {plan.creditsLimit !== null && (
                                    <div className="h-1.5 rounded-full bg-border-soft overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-50 rounded-full"
                                            style={{ width: `${Math.min((plan.creditsUsed / plan.creditsLimit) * 100, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {plan.features && [
                                ['Document summaries', plan.features.docSummary],
                                ['Bulk uploads', plan.features.bulkSummary],
                                ['Audio summaries', plan.features.audioSummary],
                            ].map(([label, usage]) => usage && (
                                <div key={label}>
                                    <div className="flex justify-between text-xs text-richblack-400 mb-1.5">
                                        <span>{label}</span>
                                        <span className="font-mono">{usage.limit === null ? 'Unlimited' : `${usage.used} / ${usage.limit}`}</span>
                                    </div>
                                    {usage.limit !== null && (
                                        <div className="h-1.5 rounded-full bg-border-soft overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-50 rounded-full"
                                                style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            <p className="text-xs text-richblack-400">{plan.name} plan</p>
                        </div>
                    )}
                </aside>

                <main className="flex-1 min-w-0">
                    {isBanned ? <BannedNotice user={user} /> : <AnimatedOutlet />}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
