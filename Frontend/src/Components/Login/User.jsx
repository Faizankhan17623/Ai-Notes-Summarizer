import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { LoginUser } from '../../Services/operations/Auth.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'
import OAuthButtons from './OAuthButtons.jsx'

const User = () => {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading } = useSelector((state) => state.auth)
    const [searchParams] = useSearchParams()

    // Backend/controllers/OAuth.js redirects failures straight here sir (a redirect can't
    // deliver a JSON error the normal toast.error(catch) path would show)
    useEffect(() => {
        const oauthError = searchParams.get('oauthError')
        if (oauthError) toast.error(oauthError)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onSubmit = (data) => {
        dispatch(LoginUser(data.email, data.password, navigate))
    }

    return (
        <AuthLayout
            title="Welcome back"
            footer={
                <p className="text-richblack-300 text-sm">
                    Don't have an account? <Link to="/Signup" className="text-yellow-50 font-medium">Sign up</Link>
                </p>
            }
        >
            <Helmet><title>Log in — Notewise</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    {...register('email', { required: true })}
                    error={errors.email && "Email is required"}
                />

                <div>
                    <Input
                        label="Password"
                        type="password"
                        {...register('password', { required: true })}
                        error={errors.password && "Password is required"}
                    />
                    <div className="text-right mt-2">
                        <Link to="/forgot-password" className="text-yellow-50 text-xs">Forgot password?</Link>
                    </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Logging in..." : "Log in"}
                </Button>
            </form>

            <OAuthButtons />
        </AuthLayout>
    )
}

export default User
