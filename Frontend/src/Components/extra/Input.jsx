import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const Input = ({ label, error, className = "", id, type, name, ...props }) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    // react-hook-form's register() always supplies name sir — fall back to it so the
    // <label htmlFor> actually matches the <input id> instead of both being undefined.
    const inputId = id || name

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-sm text-richblack-300 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={inputId}
                    name={name}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    className={`w-full bg-surface-hover border rounded-md px-3 py-2 text-richblack-5 outline-none transition-colors
                        ${isPassword ? "pr-10" : ""}
                        ${error ? "border-danger-soft focus:border-danger-soft" : "border-border-soft focus:border-yellow-50"}
                        ${className}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        tabIndex={-1}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-richblack-400 hover:text-richblack-100 cursor-pointer transition-colors"
                    >
                        {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                )}
            </div>
            {error && <p className="text-danger-soft text-xs mt-1.5">{error}</p>}
        </div>
    )
}

export default Input
