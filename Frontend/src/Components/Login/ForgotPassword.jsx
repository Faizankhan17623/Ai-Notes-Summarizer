import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaCheck } from 'react-icons/fa'
import { ForgotPassword as ForgotPasswordOp } from '../../Services/operations/Auth.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

const ForgotPassword = () => {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const { loading } = useSelector((state) => state.auth)
    const [sentTo, setSentTo] = useState(null)

    const onSubmit = async (data) => {
        const sent = await dispatch(ForgotPasswordOp(data.email))
        if (sent) setSentTo(data.email)
    }

    const resend = () => {
        if (sentTo) dispatch(ForgotPasswordOp(sentTo))
    }

    if (sentTo) {
        return (
            <AuthLayout
                title="Check your inbox"
                footer={<Link to="/Login" className="text-yellow-50 text-sm">Back to log in</Link>}
            >
                <Helmet><title>Reset link sent — Notewise</title></Helmet>
                <div className="flex flex-col items-center text-center py-2">
                    <div className="w-14 h-14 rounded-full bg-yellow-50/10 flex items-center justify-center mb-5 animate-[scale-in_0.3s_ease-out]">
                        <FaCheck className="text-yellow-50 animate-[check-pop_0.4s_ease-out_0.15s_both]" size={22} />
                    </div>
                    <p className="text-richblack-5 mb-1">Reset link sent to</p>
                    <p className="text-yellow-50 font-semibold mb-6 break-all">{sentTo}</p>
                    <p className="text-richblack-300 text-sm mb-6">
                        Didn't get it? Check spam, or resend below.
                    </p>
                    <Button onClick={resend} disabled={loading} variant="outline" className="w-full">
                        {loading ? "Sending..." : "Resend email"}
                    </Button>
                </div>
                <style>{`
                    @keyframes scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes check-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                `}</style>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="We'll email you a link to reset it."
            footer={<Link to="/Login" className="text-yellow-50 text-sm">Back to log in</Link>}
        >
            <Helmet><title>Forgot password — Notewise</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    {...register('email', { required: true })}
                    error={errors.email && "Email is required"}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send reset link"}
                </Button>
            </form>
        </AuthLayout>
    )
}

export default ForgotPassword
