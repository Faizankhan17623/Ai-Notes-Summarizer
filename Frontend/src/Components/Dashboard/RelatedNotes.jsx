import { Link } from 'react-router-dom'
import { FaLayerGroup } from 'react-icons/fa'

// tag-overlap suggestions sir — shown only when there's something to show, quietly
// hidden otherwise rather than rendering an empty-state card
const RelatedNotes = ({ notes }) => {
    if (!notes?.length) return null

    return (
        <div className="border border-border-soft bg-surface rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-richblack-400 font-semibold mb-4">Related notes</p>
            <ul className="space-y-3">
                {notes.map((note) => (
                    <li key={note._id}>
                        <Link
                            to={`/Dashboard/Note/${note._id}`}
                            className="flex items-start gap-2.5 group"
                        >
                            <FaLayerGroup className="text-richblack-500 group-hover:text-yellow-50 mt-0.5 shrink-0 transition-colors" size={12} />
                            <div className="min-w-0">
                                <p className="text-richblack-100 group-hover:text-yellow-50 text-sm truncate transition-colors">
                                    {note.title}
                                </p>
                                <p className="text-richblack-500 text-xs mt-0.5">
                                    {note.overlap} shared tag{note.overlap === 1 ? '' : 's'}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default RelatedNotes
