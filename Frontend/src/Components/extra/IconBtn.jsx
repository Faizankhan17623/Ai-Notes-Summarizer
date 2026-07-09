const IconBtn = ({ text, onclick, children, type = "button", outline = false, disabled = false, customClasses = "" }) => {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onclick}
            className={`flex items-center gap-x-2 justify-center rounded-md px-5 py-2 font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${outline
                    ? "border border-yellow-50 text-yellow-50 hover:bg-yellow-50/10"
                    : "bg-yellow-50 text-richblack-900 hover:scale-95"
                } ${customClasses}`}
        >
            {children ? (
                <>
                    <span>{text}</span>
                    {children}
                </>
            ) : (
                text
            )}
        </button>
    )
}

export default IconBtn
