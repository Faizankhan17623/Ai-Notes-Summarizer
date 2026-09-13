import { useOutlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { pageTransition } from './motionVariants.js'

// Drop-in replacement for <Outlet /> inside a persistent layout (AdminLayout,
// DashboardLayout, SupportLayout) sir — animates ONLY the nested page content on
// navigation, leaving the sidebar/Navbar around it untouched. Keying AnimatePresence at
// the top-level <Routes> (the old approach) remounted the whole matched tree, including
// the parent layout, on every click — that's what made the sidebar flash on every nav.
//
// mode="wait" (not "popLayout"/default) used to fully unmount the outgoing page before
// mounting the next one — new page's mount-time fetch then showed its own loading spinner
// during that gap, reading as the whole content area (not just the sidebar) blanking out
// and coming back. Overlapping the exit/enter here removes that gap: the old page fades
// out while the new one fades in on top of it, so nav feels continuous and only that new
// page's own in-place spinner is visible while its data loads.
const AnimatedOutlet = () => {
    const location = useLocation()
    const element = useOutlet()

    return (
        // the "grid" wrapper + [grid-area:1/1] on each page sir — while the outgoing and
        // incoming motion.div are briefly both mounted (exit/enter overlap), this stacks
        // them on top of each other instead of the incoming one pushing the outgoing one
        // down the page. Self-contained here so every caller (AdminLayout, DashboardLayout,
        // SupportLayout) gets it for free without touching their own <main> markup.
        <div className="grid">
            <AnimatePresence initial={false}>
                <motion.div
                    key={location.pathname}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageTransition}
                    className="[grid-area:1/1]"
                >
                    {element}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default AnimatedOutlet
