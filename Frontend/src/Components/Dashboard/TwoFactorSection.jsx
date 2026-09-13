import { useState } from 'react'
import { useDispatch } from 'react-redux'
import Swal from 'sweetalert2'
import { GetProfile } from '../../Services/operations/Auth.js'
import { GetTwoFactorSetup, EnableTwoFactor, DisableTwoFactor } from '../../Services/operations/TwoFactor.js'
import IconBtn from '../extra/IconBtn.jsx'
import Input from '../extra/Input.jsx'

// same bordered-card look as Account.jsx's own SectionCard sir — not imported directly since
// that one's a local, unexported const in Account.jsx; duplicating the two Tailwind classes
// here is simpler than exporting/threading it through
const Card = ({ title, children }) => (
    <div className="border border-border-soft bg-surface rounded-lg p-6 space-y-4">
        <h2 className="text-richblack-5 font-semibold">{title}</h2>
        {children}
    </div>
)

// three states sir: OFF (show "Set up" button) -> SETTING_UP (QR + confirm code) -> ON
// (show "Disable" + a password-confirm prompt). backupCodes is only ever non-null right
// after a successful /2fa/enable, shown once, then this component forgets it on unmount/
// next render — Backend/controllers/TwoFactor.js never returns them again after that call.
const TwoFactorSection = ({ enabled, token }) => {
    const dispatch = useDispatch()
    const [setupData, setSetupData] = useState(null) // { secret, qrDataUrl } while mid-setup
    const [confirmCode, setConfirmCode] = useState('')
    const [backupCodes, setBackupCodes] = useState(null)
    const [busy, setBusy] = useState(false)

    const startSetup = async () => {
        setBusy(true)
        const data = await GetTwoFactorSetup(token)
        setBusy(false)
        if (data) setSetupData(data)
    }

    const confirmEnable = async () => {
        if (!confirmCode.trim()) return
        setBusy(true)
        const codes = await EnableTwoFactor(setupData.secret, confirmCode.trim(), token)
        setBusy(false)
        if (codes) {
            setBackupCodes(codes)
            setSetupData(null)
            setConfirmCode('')
            dispatch(GetProfile(token))
        }
    }

    const handleDisable = async () => {
        const { value: password } = await Swal.fire({
            title: 'Disable two-factor authentication?',
            input: 'password',
            inputLabel: 'Confirm your password to continue',
            inputPlaceholder: 'Password',
            showCancelButton: true,
            confirmButtonText: 'Disable',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-richblack-5)',
        })
        if (password) {
            const ok = await DisableTwoFactor(password, token)
            if (ok) dispatch(GetProfile(token))
        }
    }

    // shown exactly once, right after enabling sir — never retrievable again, same one-shot
    // reveal as the API key feature
    if (backupCodes) {
        return (
            <Card title="Two-factor authentication">
                <p className="text-richblack-5 text-sm font-medium">Two-factor authentication is now enabled.</p>
                <p className="text-richblack-400 text-sm">
                    Save these backup codes somewhere safe — each one can be used once if you lose access to your authenticator app. They will not be shown again.
                </p>
                <div className="grid grid-cols-2 gap-2 bg-surface-hover border border-border-soft rounded-md p-4 font-mono text-sm text-richblack-5">
                    {backupCodes.map((c) => <span key={c}>{c}</span>)}
                </div>
                <IconBtn text="Done" outline onclick={() => setBackupCodes(null)} />
            </Card>
        )
    }

    if (setupData) {
        return (
            <Card title="Two-factor authentication">
                <p className="text-richblack-400 text-sm">Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it shows.</p>
                <img src={setupData.qrDataUrl} alt="Two-factor authentication QR code" className="w-40 h-40 rounded-md border border-border-soft" />
                <Input label="Confirmation code" name="confirmCode" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="123456" />
                <div className="flex gap-3">
                    <IconBtn text={busy ? "Verifying..." : "Confirm and enable"} disabled={busy || !confirmCode.trim()} onclick={confirmEnable} />
                    <IconBtn text="Cancel" outline onclick={() => { setSetupData(null); setConfirmCode('') }} />
                </div>
            </Card>
        )
    }

    return (
        <Card title="Two-factor authentication">
            <p className="text-richblack-400 text-sm">
                {enabled
                    ? "Two-factor authentication is enabled. You'll need a code from your authenticator app every time you log in."
                    : "Add an extra layer of security — after entering your password, you'll also need a code from an authenticator app."}
            </p>
            {enabled ? (
                <IconBtn text="Disable two-factor authentication" outline onclick={handleDisable} />
            ) : (
                <IconBtn text={busy ? "Loading..." : "Set up two-factor authentication"} disabled={busy} onclick={startSetup} />
            )}
        </Card>
    )
}

export default TwoFactorSection
