import { Outlet, NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaHome, FaPlus, FaHistory, FaClipboardCheck, FaComments, FaUserCog } from 'react-icons/fa'
import Navbar from '../Home/Navbar.jsx'

const navItems = [
    { to: '/Dashboard', label: 'Overview', icon: FaHome, end: true },
    { to: '/Dashboard/New-Summary', label: 'New summary', icon: FaPlus },
    { to: '/Dashboard/History', label: 'All notes', icon: FaHistory },
    { to: '/Dashboard/Review', label: 'Review queue', icon: FaClipboardCheck },
    { to: '/Dashboard/Chats', label: 'Chats', icon: FaComments },
    { to: '/Dashboard/Account', label: 'Account', icon: FaUserCog },
]

// persistent sidebar shell for every logged-in page sir — wraps the private routes via
// an Outlet (see App.jsx), so Navbar + nav + the credits widget render exactly once
// instead of every page re-rendering its own copy
const DashboardLayout = () => {
    const { plan } = useSelector((state) => state.profile)

    return (
        <div className="min-h-screen bg-richblack-900">
            <Navbar />
            <div className="flex">
                <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border-soft bg-surface-raised px-3 py-5 min-h-[calc(100vh-73px)]">
                    <nav className="flex flex-col gap-1">
                        {navItems.map(({ to, label, icon: Icon, end }) => (
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
                        ))}
                    </nav>

                    {plan && (
                        <div className="mt-auto border border-border-soft rounded-lg p-3 bg-surface">
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
                            <p className="text-xs text-richblack-400 mt-2">{plan.name} plan</p>
                        </div>
                    )}
                </aside>

                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
