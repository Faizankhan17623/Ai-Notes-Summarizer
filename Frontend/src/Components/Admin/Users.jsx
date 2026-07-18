import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaSearch } from 'react-icons/fa'
import Swal from 'sweetalert2'
import { GetUsers, BanUser, UnbanUser, SetRole } from '../../Services/operations/Admin.js'
import StatusBadge from './StatusBadge.jsx'

const Users = () => {
    const dispatch = useDispatch()
    const { token, user } = useSelector((state) => state.auth)
    const { users, loading } = useSelector((state) => state.admin)
    const [search, setSearch] = useState('')
    // ban/unban and role changes are Admin-only sir — Support can look users up to help them,
    // but the backend 403s these calls for Support too, so hide the controls rather than let
    // them click something that just fails
    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        dispatch(GetUsers(token, 1, search))
    }, [dispatch, token, search])

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

            <div className="relative mb-6 max-w-sm">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-500" size={13} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-surface border border-border-soft text-richblack-5 rounded-md pl-9 pr-4 py-2 outline-none focus:border-yellow-50 transition-colors"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="border border-border-soft bg-surface rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-border-soft">
                                    <th className="py-3 px-4 font-medium">Name</th>
                                    <th className="py-3 px-4 font-medium">Email</th>
                                    <th className="py-3 px-4 font-medium">Role</th>
                                    <th className="py-3 px-4 font-medium">Plan</th>
                                    <th className="py-3 px-4 font-medium">Status</th>
                                    <th className="py-3 px-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className="border-b border-border-soft last:border-b-0 text-richblack-200 hover:bg-surface-hover transition-colors">
                                        <td className="py-3 px-4 text-richblack-5">{u.firstName} {u.lastName}</td>
                                        <td className="py-3 px-4">{u.email}</td>
                                        <td className="py-3 px-4">
                                            {isAdmin ? (
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => dispatch(SetRole(u._id, e.target.value, token))}
                                                    className="bg-surface-hover border border-border-soft rounded px-2 py-1 text-richblack-200 outline-none focus:border-yellow-50"
                                                >
                                                    <option value="User">User</option>
                                                    <option value="Support">Support</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className="text-richblack-300">{u.role}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs">{u.SubType}</td>
                                        <td className="py-3 px-4">
                                            {u.isBanned ? <StatusBadge tone="danger">Banned</StatusBadge> : <StatusBadge tone="good">Active</StatusBadge>}
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
                </div>
            )}
        </div>
    )
}

export default Users
