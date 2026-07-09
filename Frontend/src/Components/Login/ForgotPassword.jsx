import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ForgotPassword as ForgotPasswordOp } from '../../Services/operations/Auth.js'

const ForgotPassword = () => {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const { loading } = useSelector((state) => state.auth)

    const onSubmit = (data) => {
        dispatch(ForgotPasswordOp(data.email))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-richblack-900 px-6 py-12">
            <Helmet><title>Forgot password — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-richblack-800 rounded-lg p-8 border border-richblack-700">
                <h1 className="text-2xl font-bold text-richblack-5 mb-2">Reset your password</h1>
                <p className="text-richblack-300 text-sm mb-6">We'll email you a link to reset it.</p>

                <div className="mb-6">
                    <label className="text-sm text-richblack-100 block mb-1">Email</label>
                    <input type="email" {...register('email', { required: true })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.email && <p className="text-pink-200 text-xs mt-1">Email is required</p>}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold hover:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                    {loading ? "Sending..." : "Send reset link"}
                </button>

                <p className="text-richblack-300 text-sm text-center mt-4">
                    <Link to="/Login" className="text-yellow-50">Back to log in</Link>
                </p>
            </form>
        </div>
    )
}

export default ForgotPassword
