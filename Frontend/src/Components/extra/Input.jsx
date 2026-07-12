const Input = ({ label, error, className = "", id, ...props }) => (
    <div className="w-full">
        {label && (
            <label htmlFor={id} className="block text-sm text-richblack-300 mb-1.5">
                {label}
            </label>
        )}
        <input
            id={id}
            className={`w-full bg-surface-hover border rounded-md px-3 py-2 text-richblack-5 outline-none transition-colors
                ${error ? "border-danger-soft focus:border-danger-soft" : "border-border-soft focus:border-yellow-50"}
                ${className}`}
            {...props}
        />
        {error && <p className="text-danger-soft text-xs mt-1.5">{error}</p>}
    </div>
)

export default Input
