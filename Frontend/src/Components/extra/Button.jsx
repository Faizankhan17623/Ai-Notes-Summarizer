const VARIANTS = {
    solid: "bg-yellow-50 text-richblack-900 hover:scale-95",
    outline: "border border-yellow-50 text-yellow-50 hover:bg-yellow-50/10",
    ghost: "text-richblack-100 hover:bg-surface-hover",
    danger: "bg-danger-soft text-richblack-900 hover:scale-95",
}

const Button = ({
    children,
    onClick,
    type = "button",
    variant = "solid",
    disabled = false,
    className = "",
}) => (
    <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`flex items-center gap-x-2 justify-center rounded-md px-5 py-2 font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${VARIANTS[variant]} ${className}`}
    >
        {children}
    </button>
)

export default Button
