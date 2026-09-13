import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { FaTachometerAlt, FaTag, FaSignOutAlt } from 'react-icons/fa'
import { LogoutUser } from '../../Services/operations/Auth.js'

// circular initials avatar + dropdown sir — same click-outside pattern as NotificationBell,
// same two-letter initials convention as Admin/Users.jsx. Just Dashboard + Pricing + Logout
// per the reference design — Review/Account stay reachable from the Dashboard sidebar (see
// DashboardLayout.jsx's navItems) rather than being duplicated here.
const dashboardDestination = (role) => {
    if (role === 'Admin') return { to: '/Admin', label: 'Admin Dashboard' }
    if (role === 'Support') return { to: '/Support', label: 'Support Dashboard' }
    return { to: '/Dashboard', label: 'Dashboard' }
}

const ProfileMenu = () => {
    const { user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() => {
        const onClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const { to: dashboardTo, label: dashboardLabel } = dashboardDestination(user?.role)
    // same two-letter convention sir as Admin/Users.jsx's `initials` helper
    const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()

    return (
        <div className="relative" ref={rootRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                title="Account"
                aria-label="Account menu"
                aria-expanded={open}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
            >
                <span className="w-7 h-7 rounded-full bg-yellow-50/10 text-yellow-50 flex items-center justify-center text-xs font-semibold border border-border-soft">
                    {initials}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-raised border border-border-soft rounded-lg shadow-lg z-50 py-1.5">
                    <div className="px-4 py-2.5">
                        <p className="text-richblack-5 text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-richblack-400 text-xs truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="border-t border-border-soft" />
                    <Link
                        to={dashboardTo}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-richblack-100 hover:bg-surface-hover hover:text-richblack-25 transition-colors"
                    >
                        <FaTachometerAlt size={13} /> {dashboardLabel}
                    </Link>
                    {/* Pricing/plans are a User-only concern sir — Admin/Support are staff
                        accounts that can't purchase anything (see Backend/controllers/
                        Payment.js createOrder's role block), so it's hidden for both roles */}
                    {!['Admin', 'Support'].includes(user?.role) && (
                        <Link
                            to="/Pricing"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-richblack-100 hover:bg-surface-hover hover:text-richblack-25 transition-colors"
                        >
                            <FaTag size={13} /> Pricing
                        </Link>
                    )}
                    <div className="border-t border-border-soft" />
                    <button
                        onClick={() => {
                            setOpen(false)
                            dispatch(LogoutUser(navigate))
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-richblack-100 hover:bg-surface-hover hover:text-richblack-25 transition-colors cursor-pointer"
                    >
                        <FaSignOutAlt size={13} /> Logout
                    </button>
                </div>
            )}
        </div>
    )
}

export default ProfileMenu
