import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ResetPassword as ResetPasswordOp } from '../../Services/operations/Auth.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

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
        <AuthLayout title="Choose a new password">
            <Helmet><title>Reset password — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="New password"
                    type="password"
                    {...register('newPassword', { required: true, minLength: 6 })}
                    error={errors.newPassword && "At least 6 characters"}
                />

                <Input
                    label="Confirm new password"
                    type="password"
                    {...register('confirmNewPassword', { required: true, validate: (v) => v === newPassword || "Passwords do not match" })}
                    error={errors.confirmNewPassword?.message}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Resetting..." : "Reset password"}
                </Button>
            </form>
        </AuthLayout>
    )
}

export default ResetPassword
