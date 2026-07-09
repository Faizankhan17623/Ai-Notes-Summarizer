// renders both shapes sir — old notes have a flat actionItems array, new notes have
// { tasks, keyDates, decisions }. Keeping this in one place means Report.jsx doesn't
// need to know which shape it's looking at.
const ActionItemsCard = ({ actionItems }) => {
    if (!actionItems) return null

    // old flat-array shape sir
    if (Array.isArray(actionItems)) {
        if (actionItems.length === 0) return null
        return (
            <div className="border border-richblack-700 rounded-lg p-6 mb-6">
                <h2 className="text-richblack-5 font-semibold mb-3">Action items</h2>
                <ul className="list-disc list-inside space-y-2 text-richblack-200">
                    {actionItems.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </div>
        )
    }

    // new structured shape sir
    const { tasks = [], keyDates = [], decisions = [] } = actionItems
    if (tasks.length === 0 && keyDates.length === 0 && decisions.length === 0) return null

    return (
        <div className="border border-richblack-700 rounded-lg p-6 mb-6 space-y-4">
            <h2 className="text-richblack-5 font-semibold">Action items</h2>

            {tasks.length > 0 && (
                <div>
                    <h3 className="text-yellow-50 text-sm font-medium mb-2">Tasks</h3>
                    <ul className="list-disc list-inside space-y-1 text-richblack-200 text-sm">
                        {tasks.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}

            {keyDates.length > 0 && (
                <div>
                    <h3 className="text-yellow-50 text-sm font-medium mb-2">Key dates</h3>
                    <ul className="list-disc list-inside space-y-1 text-richblack-200 text-sm">
                        {keyDates.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                </div>
            )}

            {decisions.length > 0 && (
                <div>
                    <h3 className="text-yellow-50 text-sm font-medium mb-2">Decisions</h3>
                    <ul className="list-disc list-inside space-y-1 text-richblack-200 text-sm">
                        {decisions.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default ActionItemsCard
