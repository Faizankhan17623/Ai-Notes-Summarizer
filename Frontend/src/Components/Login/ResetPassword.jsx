import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ResetPassword as ResetPasswordOp } from '../../Services/operations/Auth.js'

const ResetPassword = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { token: resetToken } = useParams()
    const { loading } = useSelector((state) => state.auth)
    const newPassword = watch('newPassword')

    const onSubmit = (data) => {
        dispatch(ResetPasswordOp(resetToken, data.newPassword, data.confirmNewPassword, navigate))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-richblack-900 px-6 py-12">
            <Helmet><title>Reset password — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-richblack-800 rounded-lg p-8 border border-richblack-700">
                <h1 className="text-2xl font-bold text-richblack-5 mb-6">Choose a new password</h1>

                <div className="mb-4">
                    <label className="text-sm text-richblack-100 block mb-1">New password</label>
                    <input type="password" {...register('newPassword', { required: true, minLength: 6 })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.newPassword && <p className="text-pink-200 text-xs mt-1">At least 6 characters</p>}
                </div>

                <div className="mb-6">
                    <label className="text-sm text-richblack-100 block mb-1">Confirm new password</label>
                    <input type="password" {...register('confirmNewPassword', { required: true, validate: (v) => v === newPassword || "Passwords do not match" })} className="w-full bg-richblack-700 text-richblack-5 rounded-md px-3 py-2 outline-none" />
                    {errors.confirmNewPassword && <p className="text-pink-200 text-xs mt-1">{errors.confirmNewPassword.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold hover:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                    {loading ? "Resetting..." : "Reset password"}
                </button>
            </form>
        </div>
    )
}

export default ResetPassword
