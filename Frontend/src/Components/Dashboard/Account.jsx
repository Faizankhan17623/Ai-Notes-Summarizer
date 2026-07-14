import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaExclamationTriangle } from 'react-icons/fa'
import Swal from 'sweetalert2'
import {
    GetProfile, UpdateFirstName, UpdateLastName, UpdateDigestPreference, UpdateDailyGoal, UpdatePassword,
    DeleteAccount, RecoverAccount, LogoutUser
} from '../../Services/operations/Auth.js'
import { GetPlans, StartCreditPackCheckout } from '../../Services/operations/Payment.js'
import Loading from '../extra/Loading.jsx'
import IconBtn from '../extra/IconBtn.jsx'
import ApiKeySection from './ApiKeySection.jsx'

const SectionCard = ({ title, children }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-6 space-y-4">
        <h2 className="text-richblack-5 font-semibold">{title}</h2>
        {children}
    </div>
)

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
    const [dailyGoal, setDailyGoal] = useState(5)

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
            setDailyGoal(profile.dailyGoal ?? 5)
        }
    }, [profile])

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Delete your account?',
            text: 'You will have 2 days to recover it by logging back in.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (result.isConfirmed) {
            dispatch(DeleteAccount(token, navigate))
        }
    }

    if (loading || !profile) return <Loading text="Loading profile..." />

    return (
        <>
            <Helmet><title>Account — Notewise</title></Helmet>

            <div className="max-w-3xl mx-auto px-6 py-10">
                <h1 className="font-display text-3xl font-semibold text-richblack-5 mb-8">Account</h1>

                {profile.Buffer && (
                    <div className="border border-danger-soft bg-danger-soft/10 rounded-lg p-4 flex items-center justify-between mb-6">
                        <p className="text-danger-soft text-sm">Your account is scheduled for deletion on {profile.BufferTiming}.</p>
                        <button onClick={() => dispatch(RecoverAccount(token))} className="bg-danger-soft text-richblack-900 text-sm rounded-md px-3 py-1.5 cursor-pointer shrink-0 ml-4">
                            Recover
                        </button>
                    </div>
                )}

                {plan && (
                    <div className="border border-border-soft bg-surface-raised rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">Current plan</p>
                                <p className="font-display text-xl font-semibold text-richblack-5">{plan.name}</p>
                            </div>
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">Summaries this cycle</p>
                                    <p className="font-mono text-lg text-richblack-5">
                                        {plan.creditsLimit === null ? '∞' : `${plan.creditsUsed}/${plan.creditsLimit}`}
                                    </p>
                                </div>
                                {activity && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-richblack-400 mb-1">Total activity</p>
                                        <p className="font-mono text-lg text-richblack-5">{activity.noteCount} notes · {activity.chatCount} chats</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {plan.creditsLimit !== null && plan.bonusCredits > 0 && (
                            <p className="text-richblack-400 text-sm mt-3 pt-3 border-t border-border-soft">
                                + {plan.bonusCredits} top-up credits available this cycle
                            </p>
                        )}
                    </div>
                )}

                {plan && plan.creditsLimit !== null && (
                    <SectionCard title="Need more credits?">
                        <p className="text-richblack-400 text-sm -mt-2">
                            You have {plan.bonusCredits || 0} top-up credits available this cycle.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            {creditPacks.map((pack) => (
                                <div key={pack.key} className="border border-border-soft bg-surface-hover rounded-lg p-4">
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
                    </SectionCard>
                )}

                <div className="mt-6 space-y-6">
                    <SectionCard title="Profile">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-richblack-100 block mb-1">First name</label>
                                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors" />
                            </div>
                            <div>
                                <label className="text-sm text-richblack-100 block mb-1">Last name</label>
                                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <IconBtn text="Save first name" outline onclick={() => dispatch(UpdateFirstName(firstName, token))} />
                            <IconBtn text="Save last name" outline onclick={() => dispatch(UpdateLastName(lastName, token))} />
                        </div>
                        <p className="text-richblack-400 text-sm pt-2 border-t border-border-soft">Email: {profile.email}</p>
                        <label className="flex items-center gap-2 text-sm text-richblack-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={profile.receiveDigest ?? true}
                                onChange={(e) => dispatch(UpdateDigestPreference(e.target.checked, token))}
                            />
                            Email me a weekly summary of my activity
                        </label>
                    </SectionCard>

                    <SectionCard title="Study goal">
                        <p className="text-richblack-400 text-sm -mt-2">
                            Set a daily target for study actions (reviewing flashcards, taking quizzes, or creating summaries) to track on your dashboard.
                        </p>
                        {activity && (
                            <p className="text-richblack-300 text-sm">
                                Current streak: <span className="text-yellow-50 font-semibold">{activity.currentStreak || 0} day{activity.currentStreak === 1 ? '' : 's'}</span>
                                {' · '}Longest streak: <span className="text-richblack-5 font-semibold">{activity.longestStreak || 0} day{activity.longestStreak === 1 ? '' : 's'}</span>
                            </p>
                        )}
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-richblack-100" htmlFor="dailyGoal">Actions per day</label>
                            <input
                                id="dailyGoal"
                                type="number"
                                min={1}
                                max={50}
                                value={dailyGoal}
                                onChange={(e) => setDailyGoal(Number(e.target.value))}
                                className="w-24 bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors"
                            />
                            <IconBtn text="Save goal" outline onclick={() => dispatch(UpdateDailyGoal(dailyGoal, token))} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Change password">
                        <input type="password" placeholder="Old password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors" />
                        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors" />
                        <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors" />
                        <IconBtn
                            text="Update password"
                            outline
                            onclick={() => {
                                dispatch(UpdatePassword(oldPassword, newPassword, confirmNewPassword, token))
                                setOldPassword(''); setNewPassword(''); setConfirmNewPassword('')
                            }}
                        />
                    </SectionCard>

                    <ApiKeySection isPaidPlan={isPaidPlan} />

                    {!profile.Buffer && (
                        <div className="border border-danger-soft/40 rounded-lg p-6">
                            <h2 className="text-danger-soft font-semibold mb-2 flex items-center gap-2">
                                <FaExclamationTriangle size={14} /> Danger zone
                            </h2>
                            <p className="text-richblack-400 text-sm mb-4">Deleting your account gives you a 2-day window to recover it.</p>
                            <button onClick={handleDelete} className="bg-danger-soft text-richblack-900 rounded-md px-4 py-2 text-sm font-semibold cursor-pointer hover:scale-95 transition-all">
                                Delete account
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default Account
