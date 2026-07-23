import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

// circular initials avatar sir — same two-letter convention as Admin/Users.jsx's `initials`
// helper, just styled as a nav icon button (rounded-full hover pill) instead of a table cell.
// Plain link to Account, no dropdown — Account already has everything (profile, password,
// 2FA, plan), so a menu here would just be a shortcut to a shortcut.
const ProfileMenu = () => {
    const { user } = useSelector((state) => state.auth)
    const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()

    return (
        <Link
            to="/Dashboard/Account"
            title="Account"
            aria-label="Account"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
        >
            <span className="w-7 h-7 rounded-full bg-yellow-50/10 text-yellow-50 flex items-center justify-center text-xs font-semibold border border-border-soft">
                {initials || <FaUserFallback />}
            </span>
        </Link>
    )
}

// tiny inline fallback sir — only ever shown for the split-second before user.firstName/lastName
// are populated, avoids importing a whole icon just for that edge case
const FaUserFallback = () => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z" />
    </svg>
)

export default ProfileMenu
