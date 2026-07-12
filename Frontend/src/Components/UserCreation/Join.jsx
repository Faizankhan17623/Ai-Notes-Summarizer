import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SendOtp } from '../../Services/operations/Auth.js'
import { setSignupData } from '../../Slices/authSlice.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

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
        <AuthLayout
            title="Create your account"
            footer={
                <p className="text-richblack-300 text-sm">
                    Already have an account? <Link to="/Login" className="text-yellow-50 font-medium">Log in</Link>
                </p>
            }
        >
            <Helmet><title>Sign up — AI Notes Summarizer</title></Helmet>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First name"
                        {...register('firstName', { required: true })}
                        error={errors.firstName && "Required"}
                    />
                    <Input
                        label="Last name"
                        {...register('lastName', { required: true })}
                        error={errors.lastName && "Required"}
                    />
                </div>

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
                        error={errors.password?.message}
                    />
                    {!errors.password && (
                        <p className="text-richblack-400 text-xs mt-1.5">
                            At least 8 characters, with uppercase, lowercase, a number, and a special character.
                        </p>
                    )}
                </div>

                <Input
                    label="Confirm password"
                    type="password"
                    {...register('confirmPassword', { required: true, validate: (v) => v === password || "Passwords do not match" })}
                    error={errors.confirmPassword?.message}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending OTP..." : "Continue"}
                </Button>
            </form>
        </AuthLayout>
    )
}

export default Join
