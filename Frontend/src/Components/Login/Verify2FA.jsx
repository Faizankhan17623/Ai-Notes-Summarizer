import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { VerifyTwoFactor } from '../../Services/operations/TwoFactor.js'
import AuthLayout from '../extra/AuthLayout.jsx'
import Input from '../extra/Input.jsx'
import Button from '../extra/Button.jsx'

// landed on after LoginUser's password check succeeds for a 2FA-enabled account sir (see
// Services/operations/Auth.js's twoFactorRequired branch) — tempToken arrives via router
// state, not a URL param, so it never sits in browser history/logs
const Verify2FA = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const { loading } = useSelector((state) => state.auth)
    const [code, setCode] = useState('')
    const tempToken = location.state?.tempToken

    // no tempToken means this page was opened directly, not via a real login attempt sir —
    // send them back to start over rather than showing a code box that can never succeed
    useEffect(() => {
        if (!tempToken) navigate('/Login')
    }, [tempToken, navigate])

    const onSubmit = (e) => {
        e.preventDefault()
        if (!code.trim()) return
        dispatch(VerifyTwoFactor(tempToken, code.trim(), navigate))
    }

    if (!tempToken) return null

    return (
        <AuthLayout
            title="Two-factor verification"
            subtitle="Enter the 6-digit code from your authenticator app, or one of your backup codes."
        >
            <Helmet><title>Verify — Notewise</title></Helmet>
            <form onSubmit={onSubmit} className="space-y-4">
                <Input
                    label="Verification code"
                    name="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456 or XXXX-XXXX"
                    autoFocus
                />
                <Button type="submit" disabled={loading || !code.trim()} className="w-full">
                    {loading ? "Verifying..." : "Verify"}
                </Button>
            </form>
        </AuthLayout>
    )
}

export default Verify2FA
