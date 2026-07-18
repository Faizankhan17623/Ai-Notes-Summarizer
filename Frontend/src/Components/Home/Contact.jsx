import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { FaEnvelope } from 'react-icons/fa'
import { SubmitContactMessage } from '../../Services/operations/Contact.js'
import MarketingLayout from './MarketingLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

const Contact = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm()
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const onSubmit = async (data) => {
        setLoading(true)
        const ok = await SubmitContactMessage(data.name, data.email, data.message)
        setLoading(false)
        if (ok) {
            setSent(true)
            reset()
        }
    }

    return (
        <MarketingLayout>
            <Helmet><title>Contact Us — Notewise</title></Helmet>

            <div className="max-w-lg mx-auto px-6 py-20">
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-richblack-5 mb-2 text-center">Contact us</h1>
                <p className="text-richblack-300 text-center mb-10">
                    Question, bug report, or feedback — send it over and we'll get back to you.
                </p>

                {sent ? (
                    <div className="border border-good/40 bg-good/10 rounded-lg p-6 text-center">
                        <FaEnvelope className="text-good text-2xl mx-auto mb-3" />
                        <p className="text-richblack-5 font-medium mb-1">Message sent</p>
                        <p className="text-richblack-300 text-sm">Thanks for reaching out — we'll reply by email soon.</p>
                        <button onClick={() => setSent(false)} className="text-yellow-50 text-sm mt-4 cursor-pointer hover:underline">
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Name"
                            {...register('name', { required: true, maxLength: 100 })}
                            error={errors.name && "Name is required"}
                        />
                        <Input
                            label="Email"
                            type="email"
                            {...register('email', { required: true })}
                            error={errors.email && "Email is required"}
                        />
                        <div>
                            <label className="text-sm text-richblack-100 block mb-1">Message</label>
                            <textarea
                                rows={5}
                                {...register('message', { required: true, minLength: 10, maxLength: 2000 })}
                                className="w-full bg-surface-hover border border-border-soft text-richblack-5 rounded-md px-3 py-2 outline-none focus:border-yellow-50 transition-colors resize-none"
                            />
                            {errors.message && (
                                <p className="text-danger-soft text-xs mt-1">
                                    {errors.message.type === 'minLength' ? "Message must be at least 10 characters" : "Message is required"}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Sending..." : "Send message"}
                        </Button>
                    </form>
                )}
            </div>
        </MarketingLayout>
    )
}

export default Contact
