import { Outlet, NavLink } from 'react-router-dom'
import { FaChartLine, FaUsers, FaCreditCard, FaEnvelopeOpenText } from 'react-icons/fa'
import Navbar from '../Home/Navbar.jsx'

// Support's own dashboard sir — separate from AdminLayout entirely, not a filtered copy of it.
// Only the "view/help" pages the backend actually lets Support call (see isSupport in
// Routes/Admin.js): Overview, Users (read + search, no ban/role controls), Payments (read-only,
// no refund button), and Contact messages (reply/resolve — the one write action Support has)
const navItems = [
    { to: '/Support', label: 'Overview', icon: FaChartLine, end: true },
    { to: '/Support/Users', label: 'Users', icon: FaUsers },
    { to: '/Support/Payments', label: 'Payments', icon: FaCreditCard },
    { to: '/Support/Messages', label: 'Contact messages', icon: FaEnvelopeOpenText },
]

// same shell pattern as AdminLayout.jsx / Dashboard/DashboardLayout.jsx sir — one persistent
// sidebar via Outlet instead of every page rendering its own Navbar+nav
const SupportLayout = () => {
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
                </aside>

                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default SupportLayout
