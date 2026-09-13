// small pill for the recurring active/banned, ok/failed, active/inactive status pattern
// across the admin tables sir — semantic tone only, never the yellow brand accent
const TONES = {
    good: 'bg-good/10 text-good',
    danger: 'bg-danger-soft/10 text-danger-soft',
    neutral: 'bg-border-soft text-richblack-300',
}

const StatusBadge = ({ tone = 'neutral', children, title }) => (
    <span title={title} className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${TONES[tone]}`}>
        {children}
    </span>
)

export default StatusBadge
