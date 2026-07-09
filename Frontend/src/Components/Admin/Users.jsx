import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { GetUsers, BanUser, UnbanUser, SetRole } from '../../Services/operations/Admin.js'
import Navbar from '../Home/Navbar.jsx'
import AdminNav from './AdminNav.jsx'
import Loading from '../extra/Loading.jsx'

const Users = () => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { users, loading } = useSelector((state) => state.admin)
    const [search, setSearch] = useState('')

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
            background: '#161D29',
            color: '#F1F2FF',
        })
        if (banReason !== undefined) {
            dispatch(BanUser(userId, banReason, token))
        }
    }

    return (
        <div className="min-h-screen bg-richblack-900">
            <Helmet><title>Admin Users — AI Notes Summarizer</title></Helmet>
            <Navbar />
            <AdminNav />

            <div className="max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Users</h1>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-richblack-800 border border-richblack-700 text-richblack-5 rounded-md px-4 py-2 outline-none focus:border-yellow-50 mb-6"
                />

                {loading ? (
                    <Loading text="Loading users..." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-richblack-400 border-b border-richblack-700">
                                    <th className="py-2 pr-4">Name</th>
                                    <th className="py-2 pr-4">Email</th>
                                    <th className="py-2 pr-4">Role</th>
                                    <th className="py-2 pr-4">Plan</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className="border-b border-richblack-800 text-richblack-200">
                                        <td className="py-2 pr-4">{u.firstName} {u.lastName}</td>
                                        <td className="py-2 pr-4">{u.email}</td>
                                        <td className="py-2 pr-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => dispatch(SetRole(u._id, e.target.value, token))}
                                                className="bg-richblack-800 rounded px-2 py-1"
                                            >
                                                <option value="User">User</option>
                                                <option value="Support">Support</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="py-2 pr-4">{u.SubType}</td>
                                        <td className="py-2 pr-4">{u.isBanned ? <span className="text-pink-200">Banned</span> : <span className="text-caribbeangreen-300">Active</span>}</td>
                                        <td className="py-2 pr-4">
                                            {u.isBanned ? (
                                                <button onClick={() => dispatch(UnbanUser(u._id, token))} className="text-caribbeangreen-300 cursor-pointer">Unban</button>
                                            ) : (
                                                <button onClick={() => handleBan(u._id)} className="text-pink-200 cursor-pointer">Ban</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Users
