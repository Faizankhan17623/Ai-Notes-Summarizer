import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CreateUser, SendOtp } from '../../Services/operations/Auth.js'

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
        <div className="min-h-screen flex items-center justify-center bg-richblack-900 px-6 py-12">
            <Helmet><title>Verify email — AI Notes Summarizer</title></Helmet>
            <form onSubmit={onSubmit} className="w-full max-w-md bg-richblack-800 rounded-lg p-8 border border-richblack-700">
                <h1 className="text-2xl font-bold text-richblack-5 mb-2">Verify your email</h1>
                <p className="text-richblack-300 text-sm mb-6">Enter the 6-digit code sent to {signupData.email}</p>

                <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                    className="w-full bg-richblack-700 text-richblack-5 text-center text-2xl tracking-[8px] rounded-md px-3 py-3 outline-none mb-6"
                    placeholder="------"
                />

                <button type="submit" disabled={loading} className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold hover:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                    {loading ? "Verifying..." : "Verify and create account"}
                </button>

                <button type="button" onClick={resend} className="w-full text-richblack-300 text-sm mt-4 cursor-pointer">
                    Didn't get a code? Resend
                </button>
            </form>
        </div>
    )
}

export default OTP
