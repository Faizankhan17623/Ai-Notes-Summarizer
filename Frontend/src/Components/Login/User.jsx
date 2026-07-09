import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LoginUser } from '../../Services/operations/Auth.js'

const User = () => {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading } = useSelector((state) => state.auth)

    const onSubmit = (data) => {
        dispatch(LoginUser(data.email, data.password, navigate))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-richblack-900 px-6 py-12">
            <Helmet><title>Log in — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-richblack-800 rounded-lg p-8 border border-richblack-700">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Welcome back</h1>

                <div className="mb-4">
                    <label className="text-sm text-richblack-100 block mb-1">Email</label>
                    <input type="email" {...register('email', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.email && <p className="text-pink-200 text-xs mt-1">Email is required</p>}
                </div>

                <div className="mb-2">
                    <label className="text-sm text-richblack-100 block mb-1">Password</label>
                    <input type="password" {...register('password', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.password && <p className="text-pink-200 text-xs mt-1">Password is required</p>}
                </div>

                <div className="text-right mb-6">
                    <Link to="/forgot-password" className="text-yellow-50 text-xs">Forgot password?</Link>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold hover:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                    {loading ? "Logging in..." : "Log in"}
                </button>

                <p className="text-richblack-300 text-sm text-center mt-4">
                    Don't have an account? <Link to="/Signup" className="text-yellow-50">Sign up</Link>
                </p>
            </form>
        </div>
    )
}

export default User
