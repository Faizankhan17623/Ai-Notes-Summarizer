import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaSun, FaMoon } from 'react-icons/fa'
import { LogoutUser } from '../../Services/operations/Auth.js'
import useTheme from '../../Hooks/useTheme.js'

const Navbar = () => {
    const { token, user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()

    return (
        <nav className="w-full border-b border-richblack-700 flex items-center justify-between px-6 py-4">
            <Link to="/" className="font-display text-xl font-semibold text-yellow-50">
                AI Notes Summarizer
            </Link>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="text-richblack-100 hover:text-richblack-25 cursor-pointer p-1.5 rounded-md hover:bg-surface-hover transition-colors"
                >
                    {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
                </button>

                <Link to="/Pricing" className="text-richblack-100 hover:text-richblack-25 text-sm">
                    Pricing
                </Link>

                {token ? (
                    <>
                        <Link to="/Dashboard" className="text-richblack-100 hover:text-richblack-25 text-sm">
                            Dashboard
                        </Link>
                        <Link to="/Dashboard/Review" className="text-richblack-100 hover:text-richblack-25 text-sm">
                            Review
                        </Link>
                        {['Admin', 'Support'].includes(user?.role) && (
                            <Link to="/Admin" className="text-richblack-100 hover:text-richblack-25 text-sm">
                                Admin
                            </Link>
                        )}
                        <button
                            onClick={() => dispatch(LogoutUser(navigate))}
                            className="bg-richblack-700 text-richblack-25 px-4 py-2 rounded-md text-sm cursor-pointer hover:bg-richblack-600"
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/Login" className="text-richblack-100 hover:text-richblack-25 text-sm">
                            Log in
                        </Link>
                        <Link to="/Signup" className="bg-yellow-50 text-richblack-900 px-4 py-2 rounded-md text-sm font-semibold hover:scale-95 transition-all">
                            Sign up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar
