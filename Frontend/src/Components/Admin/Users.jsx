import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaSearch, FaChevronLeft, FaChevronRight, FaUserShield, FaUserClock } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetUsers, BanUser, UnbanUser, SetRole } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const ROLE_TONE = {
    Admin: 'bg-yellow-50/10 text-yellow-50',
    Support: 'bg-violet-500/10 text-violet-500',
    User: 'bg-border-soft text-richblack-300',
}

const StatCard = ({ label, value, icon: Icon }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-4 flex items-center gap-3">
        {Icon && (
            <span className="w-9 h-9 rounded-md bg-yellow-50/10 text-yellow-50 flex items-center justify-center shrink-0">
                <Icon size={14} />
            </span>
        )}
        <div>
            <p className="text-xs uppercase tracking-wide text-richblack-400">{label}</p>
            <p className="font-mono text-xl text-richblack-5">{value}</p>
        </div>
    </div>
)

const initials = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()

const Users = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { users, usersTotal, usersPage, usersPages, loading } = useSelector((state) => state.admin)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [page, setPage] = useState(1)
    // ban/unban and role changes are Admin-only sir — Support can look users up to help them,
    // but the backend 403s these calls for Support too, so hide the controls rather than let
    // them click something that just fails
    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        setPage(1)
    }, [search, roleFilter])

    useEffect(() => {
        dispatch(GetUsers(token, page, search))
    }, [dispatch, token, page, search])

    // role filter is client-side sir — the backend search already narrows by name/email, and
    // the current page is only 20 rows, so a second round-trip just for role isn't worth it
    const visibleUsers = useMemo(
        () => roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter),
        [users, roleFilter]
    )

    const lockedCount = users.filter((u) => u.lockUntil && new Date(u.lockUntil) > new Date()).length
    const bannedCount = users.filter((u) => u.isBanned).length

    const handleBan = async (userId) => {
        const { value: banReason } = await Swal.fire({
            title: 'Ban this user?',
            input: 'text',
            inputPlaceholder: 'Reason (optional)',
            showCancelButton: true,
            confirmButtonText: 'Ban',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (banReason !== undefined) {
            dispatch(BanUser(userId, banReason, token))
        }
    }

    return (
        <div className="px-6 md:px-10 py-10">
            <Helmet><title>Admin Users — Notewise</title></Helmet>
            <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-6">Users</h1>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Total users" value={usersTotal} icon={FaUserShield} />
                <StatCard label="Banned (this page)" value={bannedCount} icon={FaUserShield} />
                <StatCard label="Locked out (this page)" value={lockedCount} icon={FaUserClock} />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-500" size={13} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full bg-surface border border-border-soft text-richblack-5 rounded-md pl-9 pr-4 py-2 outline-none focus:border-yellow-50 transition-colors"
                    />
                </div>
                <div className="flex gap-1.5">
                    {['all', 'User', 'Support', 'Admin'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`text-sm rounded-md px-3 py-1.5 cursor-pointer transition-colors ${roleFilter === r ? "bg-yellow-50 text-richblack-900" : "bg-surface-hover text-richblack-200 border border-border-soft hover:border-yellow-50"}`}
                        >
                            {r === 'all' ? 'All roles' : r}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : visibleUsers.length === 0 ? (
                <div className="border border-border-soft bg-surface rounded-lg text-center py-16 px-8">
                    <p className="text-richblack-300 text-sm">No users match this filter.</p>
                </div>
            ) : (
                <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-border-soft">
                                    <th className="py-3 px-4 font-medium">User</th>
                                    <th className="py-3 px-4 font-medium">Role</th>
                                    <th className="py-3 px-4 font-medium">Plan</th>
                                    <th className="py-3 px-4 font-medium">Status</th>
                                    <th className="py-3 px-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((u) => (
                                    <tr key={u._id} className="border-b border-border-soft last:border-b-0 text-richblack-200 hover:bg-surface-hover transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-yellow-50/10 text-yellow-50 flex items-center justify-center text-xs font-semibold shrink-0">
                                                    {initials(u)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-richblack-5 font-medium truncate">{u.firstName} {u.lastName}</p>
                                                    <p className="text-richblack-400 text-xs truncate">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {isAdmin ? (
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => dispatch(SetRole(u._id, e.target.value, token))}
                                                    className={`rounded px-2 py-1 outline-none focus:border-yellow-50 border border-border-soft text-xs font-medium ${ROLE_TONE[u.role] || ''}`}
                                                >
                                                    <option value="User">User</option>
                                                    <option value="Support">Support</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${ROLE_TONE[u.role] || ''}`}>{u.role}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs">{u.SubType}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1.5">
                                                {u.isBanned ? <StatusBadge tone="danger">Banned</StatusBadge> : <StatusBadge tone="good">Active</StatusBadge>}
                                                {/* self-clearing brute-force lockout sir — separate from isBanned, only shown while
                                                    actually in effect (lockUntil in the future), explains a "can't log in" ticket
                                                    that isn't a ban */}
                                                {u.lockUntil && new Date(u.lockUntil) > new Date() && (
                                                    <StatusBadge tone="neutral" title={`Locked until ${new Date(u.lockUntil).toLocaleString()}`}>
                                                        Locked out
                                                    </StatusBadge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {!isAdmin ? null : u.isBanned ? (
                                                <button onClick={() => dispatch(UnbanUser(u._id, token))} className="text-good text-xs font-medium cursor-pointer hover:underline">Unban</button>
                                            ) : (
                                                <button onClick={() => handleBan(u._id)} className="text-danger-soft text-xs font-medium cursor-pointer hover:underline">Ban</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {usersPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border-soft">
                            <p className="text-richblack-400 text-xs">Page {usersPage} of {usersPages} · {usersTotal} total</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={usersPage <= 1}
                                    className="flex items-center gap-1 text-xs rounded-md px-3 py-1.5 border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <FaChevronLeft size={10} /> Prev
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(usersPages, p + 1))}
                                    disabled={usersPage >= usersPages}
                                    className="flex items-center gap-1 text-xs rounded-md px-3 py-1.5 border border-border-soft text-richblack-200 hover:border-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    Next <FaChevronRight size={10} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Users
