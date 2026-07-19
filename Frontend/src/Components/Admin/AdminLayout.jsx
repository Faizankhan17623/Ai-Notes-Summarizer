import { Outlet, NavLink } from 'react-router-dom'
import { FaChartLine, FaChartBar, FaUsers, FaCreditCard, FaClipboardList, FaBullhorn, FaEnvelopeOpenText, FaGlobeAmericas } from 'react-icons/fa'
import Navbar from '../Home/Navbar.jsx'

// Admin-only sir — Support has its own separate dashboard (SupportLayout) with its own,
// smaller nav, so this list never needs to be filtered by role
const navItems = [
    { to: '/Admin', label: 'Overview', icon: FaChartLine, end: true },
    { to: '/Admin/Analytics', label: 'Analytics', icon: FaChartBar },
    { to: '/Admin/Traffic', label: 'Traffic', icon: FaGlobeAmericas },
    { to: '/Admin/Users', label: 'Users', icon: FaUsers },
    { to: '/Admin/Payments', label: 'Payments', icon: FaCreditCard },
    { to: '/Admin/Messages', label: 'Contact messages', icon: FaEnvelopeOpenText },
    { to: '/Admin/Audit', label: 'Audit log', icon: FaClipboardList },
    { to: '/Admin/Announcements', label: 'Announcements', icon: FaBullhorn },
]

// persistent sidebar shell for every admin page sir — same pattern as Dashboard/DashboardLayout.jsx,
// wraps the admin routes via an Outlet (see App.jsx) so Navbar + nav render exactly once
// instead of every page re-rendering its own copy
const AdminLayout = () => {
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

export default AdminLayout
