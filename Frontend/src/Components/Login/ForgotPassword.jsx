import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ForgotPassword as ForgotPasswordOp } from '../../Services/operations/Auth.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

const ForgotPassword = () => {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const { loading } = useSelector((state) => state.auth)

    const onSubmit = (data) => {
        dispatch(ForgotPasswordOp(data.email))
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
