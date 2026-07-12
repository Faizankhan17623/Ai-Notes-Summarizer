import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CreateUser, SendOtp } from '../../Services/operations/Auth.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Button from '../extra/Button.jsx'

const OTP = () => {
    const [otp, setOtp] = useState('')
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { signupData, loading } = useSelector((state) => state.auth)

    // no signup in progress sir — send them back to start over
    if (!signupData) return <Navigate to="/Signup" />

    const onSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData()
        Object.entries(signupData).forEach(([key, value]) => formData.append(key, value))
        formData.append('otp', otp)
        dispatch(CreateUser(Object.fromEntries(formData), navigate))
    }

    const resend = () => {
        dispatch(SendOtp(signupData.email))
    }

    return (
        <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code sent to ${signupData.email}`}>
            <Helmet><title>Verify email — AI Notes Summarizer</title></Helmet>
            <form onSubmit={onSubmit}>
                <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                    placeholder="------"
                    className="w-full bg-surface-hover border border-border-soft text-richblack-5 text-center text-2xl font-mono tracking-[8px] rounded-md px-3 py-3 outline-none focus:border-yellow-50 transition-colors mb-6"
                />

                <Button type="submit" disabled={loading} className="w-full mb-3">
                    {loading ? "Verifying..." : "Verify and create account"}
                </Button>

                <Button type="button" variant="ghost" onClick={resend} className="w-full text-sm">
                    Didn't get a code? Resend
                </Button>
            </form>
        </AuthLayout>
    )
}

export default OTP
