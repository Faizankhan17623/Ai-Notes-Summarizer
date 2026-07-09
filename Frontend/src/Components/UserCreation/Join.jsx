import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SendOtp } from '../../Services/operations/Auth.js'
import { setSignupData } from '../../Slices/authSlice.js'

const Join = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading } = useSelector((state) => state.auth)
    const password = watch('password')

    const onSubmit = (data) => {
        dispatch(setSignupData(data))
        dispatch(SendOtp(data.email, navigate))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-richblack-900 px-6 py-12">
            <Helmet><title>Sign up — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-richblack-800 rounded-lg p-8 border border-richblack-700">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Create your account</h1>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-sm text-richblack-100 block mb-1">First name</label>
                        <input {...register('firstName', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                        {errors.firstName && <p className="text-pink-200 text-xs mt-1">First name is required</p>}
                    </div>
                    <div>
                        <label className="text-sm text-richblack-100 block mb-1">Last name</label>
                        <input {...register('lastName', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                        {errors.lastName && <p className="text-pink-200 text-xs mt-1">Last name is required</p>}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-sm text-richblack-100 block mb-1">Email</label>
                    <input type="email" {...register('email', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.email && <p className="text-pink-200 text-xs mt-1">Email is required</p>}
                </div>

                <div className="mb-4">
                    <label className="text-sm text-richblack-100 block mb-1">Password</label>
                    <input
                        type="password"
                        {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'Password must be at least 8 characters' },
                            validate: {
                                hasLower: (v) => /[a-z]/.test(v) || 'Add at least one lowercase letter',
                                hasUpper: (v) => /[A-Z]/.test(v) || 'Add at least one uppercase letter',
                                hasNumber: (v) => /\d/.test(v) || 'Add at least one number',
                                hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || 'Add at least one special character',
                            }
                        })}
                        className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none"
                    />
                    <p className="text-richblack-400 text-xs mt-1">
                        At least 8 characters, with uppercase, lowercase, a number, and a special character.
                    </p>
                    {errors.password && <p className="text-pink-200 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="mb-6">
                    <label className="text-sm text-richblack-100 block mb-1">Confirm password</label>
                    <input type="password" {...register('confirmPassword', { required: true, validate: (v) => v === password || "Passwords do not match" })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.confirmPassword && <p className="text-pink-200 text-xs mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold hover:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                    {loading ? "Sending OTP..." : "Continue"}
                </button>

                <p className="text-richblack-300 text-sm text-center mt-4">
                    Already have an account? <Link to="/Login" className="text-yellow-50">Log in</Link>
                </p>
            </form>
        </div>
    )
}

export default Join
