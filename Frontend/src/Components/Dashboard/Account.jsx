import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import {
    GetProfile, UpdateFirstName, UpdateLastName, UpdateDigestPreference, UpdatePassword,
    DeleteAccount, RecoverAccount, LogoutUser
} from '../../Services/operations/Auth.js'
import { GetPlans, StartCreditPackCheckout } from '../../Services/operations/Payment.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import ApiKeySection from './ApiKeySection.jsx'

const Account = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token, user } = useSelector((state) => state.auth)
    const { profile, plan, activity, loading } = useSelector((state) => state.profile)
    const { creditPacks, paymentsLive } = useSelector((state) => state.payment)
    const isPaidPlan = user?.SubType && user.SubType !== 'Basic'

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')

    useEffect(() => {
        dispatch(GetProfile(token))
    }, [dispatch, token])

    useEffect(() => {
        dispatch(GetPlans())
    }, [dispatch])

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName)
            setLastName(profile.lastName)
        }
    }, [profile])

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Delete your account?',
            text: 'You will have 2 days to recover it by logging back in.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: '#161D29',
            color: '#F1F2FF',
        })
        if (result.isConfirmed) {
            dispatch(DeleteAccount(token, navigate))
        }
    }

    if (loading || !profile) return <Loading text="Loading profile..." />

    return (
        <>
            <Helmet><title>Account — AI Notes Summarizer</title></Helmet>

            <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
                <h1 className="text-2xl font-bold text-richblack-5">Account</h1>

                {profile.Buffer && (
                    <div className="border border-pink-200 bg-pink-200/10 rounded-lg p-4 flex items-center justify-between">
                        <p className="text-pink-200 text-sm">Your account is scheduled for deletion on {profile.BufferTiming}.</p>
                        <button onClick={() => dispatch(RecoverAccount(token))} className="bg-pink-200 text-richblack-900 text-sm rounded-md px-3 py-1.5 cursor-pointer">
                            Recover
                        </button>
                    </div>
                )}

                {plan && (
                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-3">Plan</h2>
                        <p className="text-richblack-200">{plan.name} — {plan.creditsLimit === null ? "unlimited" : `${plan.creditsUsed}/${plan.creditsLimit}`} summaries used this month</p>
                        {plan.creditsLimit !== null && plan.bonusCredits > 0 && (
                            <p className="text-richblack-400 text-sm mt-1">+ {plan.bonusCredits} top-up credits available this cycle</p>
                        )}
                        {activity && (
                            <p className="text-richblack-400 text-sm mt-2">{activity.noteCount} total notes · {activity.chatCount} chats</p>
                        )}
                    </div>
                )}

                {plan && plan.creditsLimit !== null && (
                    <div className="border border-border-soft bg-surface rounded-lg p-6">
                        <h2 className="text-richblack-5 font-semibold mb-1">Need more credits?</h2>
                        <p className="text-richblack-400 text-sm mb-4">
                            You have {plan.bonusCredits || 0} top-up credits available this cycle.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            {creditPacks.map((pack) => (
                                <div key={pack.key} className="border border-border-soft bg-surface rounded-lg p-4">
                                    <p className="text-richblack-5 font-semibold">{pack.name}</p>
                                    <p className="text-yellow-50 text-xl font-bold mb-3">₹{pack.priceInr}</p>
                                    <IconBtn
                                        text={paymentsLive ? "Buy" : "Coming soon"}
                                        disabled={!paymentsLive}
                                        onclick={() => dispatch(StartCreditPackCheckout(pack.key, token, user))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border border-border-soft bg-surface rounded-lg p-6 space-y-4">
                    <h2 className="text-richblack-5 font-semibold">Profile</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-richblack-100 block mb-1">First name</label>
                            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                        </div>
                        <div>
                            <label className="text-sm text-richblack-100 block mb-1">Last name</label>
                            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <IconBtn text="Save first name" outline onclick={() => dispatch(UpdateFirstName(firstName, token))} />
                        <IconBtn text="Save last name" outline onclick={() => dispatch(UpdateLastName(lastName, token))} />
                    </div>
                    <p className="text-richblack-400 text-sm">Email: {profile.email}</p>
                    <label className="flex items-center gap-2 text-sm text-richblack-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={profile.receiveDigest ?? true}
                            onChange={(e) => dispatch(UpdateDigestPreference(e.target.checked, token))}
                        />
                        Email me a weekly summary of my activity
                    </label>
                </div>

                <div className="border border-border-soft bg-surface rounded-lg p-6 space-y-4">
                    <h2 className="text-richblack-5 font-semibold">Change password</h2>
                    <input type="password" placeholder="Old password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    <IconBtn
                        text="Update password"
                        outline
                        onclick={() => {
                            dispatch(UpdatePassword(oldPassword, newPassword, confirmNewPassword, token))
                            setOldPassword(''); setNewPassword(''); setConfirmNewPassword('')
                        }}
                    />
                </div>

                <ApiKeySection isPaidPlan={isPaidPlan} />

                {!profile.Buffer && (
                    <div className="border border-pink-200/50 rounded-lg p-6">
                        <h2 className="text-pink-200 font-semibold mb-2">Danger zone</h2>
                        <p className="text-richblack-400 text-sm mb-4">Deleting your account gives you a 2-day window to recover it.</p>
                        <button onClick={handleDelete} className="bg-pink-200 text-richblack-900 rounded-md px-4 py-2 text-sm font-semibold cursor-pointer">
                            Delete account
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default Account
