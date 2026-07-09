import { NavLink } from 'react-router-dom'

const links = [
    { to: '/Admin', label: 'Overview', end: true },
    { to: '/Admin/Analytics', label: 'Analytics' },
    { to: '/Admin/Users', label: 'Users' },
    { to: '/Admin/Payments', label: 'Payments' },
    { to: '/Admin/Audit', label: 'Audit log' },
    { to: '/Admin/Announcements', label: 'Announcements' },
]

const AdminNav = () => {
    return (
        <div className="flex gap-2 border-b border-richblack-700 px-6 py-3 overflow-x-auto">
            {links.map((link) => (
                <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${isActive ? "bg-yellow-50 text-richblack-900" : "text-richblack-200 hover:bg-richblack-800"}`
                    }
                >
                    {link.label}
                </NavLink>
            ))}
        </div>
    )
}

export default AdminNav
