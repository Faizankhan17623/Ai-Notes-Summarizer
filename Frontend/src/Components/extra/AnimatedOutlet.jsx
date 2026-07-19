import { Outlet, useOutlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { pageTransition } from './motionVariants.js'

// Drop-in replacement for <Outlet /> inside a persistent layout (AdminLayout,
// DashboardLayout, SupportLayout) sir — animates ONLY the nested page content on
// navigation, leaving the sidebar/Navbar around it untouched. Keying AnimatePresence at
// the top-level <Routes> (the old approach) remounted the whole matched tree, including
// the parent layout, on every click — that's what made the sidebar flash on every nav.
const AnimatedOutlet = () => {
    const location = useLocation()
    const element = useOutlet()

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
            >
                {element}
            </motion.div>
        </AnimatePresence>
    )
}

export default AnimatedOutlet
