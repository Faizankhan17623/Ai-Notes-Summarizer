const Card = ({ title, children, className = "", bodyClassName = "space-y-4", as: Tag = "div" }) => (
    <Tag className={`border border-border-soft bg-surface rounded-lg p-6 ${className}`}>
        {title && (
            typeof title === "string"
                ? <h2 className="text-richblack-5 font-display font-semibold mb-4">{title}</h2>
                : title
        )}
        <div className={bodyClassName}>{children}</div>
    </Tag>
)

export default Card
