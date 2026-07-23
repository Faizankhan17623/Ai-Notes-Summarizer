import { Link, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaSun, FaMoon, FaSearch } from 'react-icons/fa'
import { LogoutUser } from '../../Services/operations/Auth.js'
import useTheme from '../../Hooks/useTheme.js'
import NavMegaMenu from './NavMegaMenu.jsx'
import NotificationBell from '../extra/NotificationBell.jsx'
import ProfileMenu from '../extra/ProfileMenu.jsx'
import { NAV_MENUS } from './navMenuData.js'

const Navbar = ({ showMegaMenu = false }) => {
    const { token, user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const { pathname } = useLocation()

    // inside any dashboard shell the sidebar already handles navigation sir — the top bar
    // slims down to theme toggle + bell + logout, no Pricing/Dashboard/Review links
    const inDashboard = ['/Dashboard', '/Admin', '/Support'].some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    )

    return (
        <nav className="w-full border-b border-border-soft flex items-center justify-between px-6 py-4">
            <Link to="/" className="font-display text-xl font-semibold text-yellow-50">
                Notewise
            </Link>

            {showMegaMenu && (
                <div className="hidden md:flex items-center gap-1">
                    {NAV_MENUS.map((menu) => (
                        <NavMegaMenu key={menu.label} menu={menu} />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="text-richblack-100 hover:text-richblack-25 cursor-pointer p-1.5 rounded-md hover:bg-surface-hover transition-colors"
                >
                    {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
                </button>

                {token ? (
                    <>
                        {/* search/profile are a plain-User concern sir — Admin/Support/Billing
                            don't have a /Dashboard/Search or /Dashboard/Account (PrivateRoute
                            would just bounce them), same role check as the Pricing link below */}
                        {!['Admin', 'Support', 'Billing'].includes(user?.role) && (
                            <Link
                                to="/Dashboard/Search"
                                title="Search (or press Ctrl/Cmd+K for quick nav)"
                                aria-label="Search"
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150 text-richblack-100 hover:text-richblack-25"
                            >
                                <FaSearch size={14} />
                            </Link>
                        )}
                        <NotificationBell />
                        {!['Admin', 'Support', 'Billing'].includes(user?.role) && <ProfileMenu />}
                        {/* Pricing/plans are a User-only concern sir — Admin/Support/Billing are
                            staff accounts that can't purchase anything (see Backend/controllers/
                            Payment.js createOrder's role block), so the nav link is hidden
                            for all three roles, not just while inside their own dashboard shell */}
                        {!showMegaMenu && !inDashboard && !['Admin', 'Support', 'Billing'].includes(user?.role) && (
                            <Link to="/Pricing" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                Pricing
                            </Link>
                        )}
                        {/* Admin and Support/Billing each have their own separate dashboard sir —
                            the normal user Dashboard/Review links would just bounce them via
                            PrivateRoute, so show only the link to whichever dashboard this role
                            actually owns. Label always reads "Dashboard" (not "Admin"/"Support")
                            so the main site nav looks the same regardless of role — only the
                            destination differs */}
                        {!inDashboard && (
                            user?.role === 'Admin' ? (
                                <Link to="/Admin" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                    Dashboard
                                </Link>
                            ) : (user?.role === 'Support' || user?.role === 'Billing') ? (
                                <Link to="/Support" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link to="/Dashboard" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                        Dashboard
                                    </Link>
                                    <Link to="/Dashboard/Review" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                        Review
                                    </Link>
                                </>
                            )
                        )}
                        <button
                            onClick={() => dispatch(LogoutUser(navigate))}
                            className="border border-border-soft text-richblack-100 px-4 py-2 rounded-md text-sm cursor-pointer hover:bg-surface-hover transition-colors"
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/Login" className="text-richblack-100 hover:text-richblack-25 text-sm">
                            Sign in
                        </Link>
                        <Link to="/Signup" className="bg-yellow-50 text-richblack-900 px-4 py-2 rounded-md text-sm font-semibold hover:scale-95 transition-all">
                            Try for free
                        </Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar
