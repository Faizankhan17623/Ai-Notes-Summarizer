import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaChevronDown } from 'react-icons/fa'

// Hover-driven dropdown: opens on mouse-enter, closes on mouse-leave (with a
// short delay so moving from the trigger to the panel doesn't flicker-close it).
const NavMegaMenu = ({ menu }) => {
    const [open, setOpen] = useState(false)
    const closeTimer = useRef(null)

    const handleEnter = () => {
        clearTimeout(closeTimer.current)
        setOpen(true)
    }

    const handleLeave = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 120)
    }

    return (
        <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-richblack-100 hover:text-richblack-25 hover:bg-surface-hover transition-colors cursor-pointer"
                aria-expanded={open}
            >
                {menu.label}
                <FaChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div className="w-72 border border-border-soft bg-surface-raised rounded-lg shadow-lg p-2">
                        {menu.items.map((item) => (
                            <Link
                                key={item.title}
                                to={item.href}
                                className="block rounded-md px-3 py-2 hover:bg-surface-hover transition-colors"
                            >
                                <p className="text-sm font-medium text-richblack-5">{item.title}</p>
                                <p className="text-xs text-richblack-200 mt-0.5">{item.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NavMegaMenu
