import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaSun, FaMoon } from 'react-icons/fa'
import { LogoutUser } from '../../Services/operations/Auth.js'
import useTheme from '../../Hooks/useTheme.js'
import NavMegaMenu from './NavMegaMenu.jsx'
import NotificationBell from '../extra/NotificationBell.jsx'
import { NAV_MENUS } from './navMenuData.js'

const Navbar = ({ showMegaMenu = false }) => {
    const { token, user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()

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
                    className="text-richblack-100 hover:text-richblack-25 cursor-pointer p-1.5 rounded-md hover:bg-surface-hover transition-colors"
                >
                    {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
                </button>

                {token ? (
                    <>
                        <NotificationBell />
                        {!showMegaMenu && (
                            <Link to="/Pricing" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                Pricing
                            </Link>
                        )}
                        {/* Admin and Support each have their own separate dashboard sir — the normal
                            user Dashboard/Review links would just bounce them via PrivateRoute, so
                            show only the link to whichever dashboard this role actually owns. Label
                            always reads "Dashboard" (not "Admin"/"Support") so the main site nav
                            looks the same regardless of role — only the destination differs */}
                        {user?.role === 'Admin' ? (
                            <Link to="/Admin" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                Dashboard
                            </Link>
                        ) : user?.role === 'Support' ? (
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
