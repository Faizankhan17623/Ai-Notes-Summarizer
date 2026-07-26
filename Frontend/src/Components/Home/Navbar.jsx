import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaSun, FaMoon, FaSearch } from 'react-icons/fa'
import useTheme from '../../Hooks/useTheme.js'
import NavMegaMenu from './NavMegaMenu.jsx'
import NotificationBell from '../extra/NotificationBell.jsx'
import ProfileMenu from '../extra/ProfileMenu.jsx'
import { NAV_MENUS } from './navMenuData.js'

const Navbar = ({ showMegaMenu = false }) => {
    const { token, user } = useSelector((state) => state.auth)
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
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="relative text-richblack-100 hover:text-richblack-25 cursor-pointer w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150"
                >
                    {/* both icons stay mounted and cross-fade via CSS (see index.css) sir — keying
                        off theme so each swap replays the animation instead of just holding end-state */}
                    <FaSun
                        key={`sun-${theme}`}
                        size={14}
                        className={`absolute ${theme === 'dark' ? 'animate-theme-icon-out' : 'animate-theme-icon-in'}`}
                    />
                    <FaMoon
                        key={`moon-${theme}`}
                        size={14}
                        className={`absolute ${theme === 'dark' ? 'animate-theme-icon-in' : 'animate-theme-icon-out'}`}
                    />
                </button>

                {token ? (
                    <>
                        {/* search is a plain-User concern sir — Admin/Support don't have
                            a /Dashboard/Search (PrivateRoute would just bounce them), same role
                            check as the Pricing link below. Plain icon straight to the Search
                            page per the reference design, no inline expanding input. */}
                        {!['Admin', 'Support'].includes(user?.role) && (
                            <button
                                onClick={() => navigate('/Dashboard/Search')}
                                title="Search"
                                aria-label="Search"
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150 text-richblack-100 hover:text-richblack-25 cursor-pointer"
                            >
                                <FaSearch size={14} />
                            </button>
                        )}
                        <NotificationBell />
                        <ProfileMenu />
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
