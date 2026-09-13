// Shared Motion presets sir — every animated component pulls from here so easing/timing
// stays consistent across the app instead of each file inventing its own numbers.

export const EASE = [0.16, 1, 0.3, 1]

export const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
}

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
}

// Wrap a container with this + `initial="hidden" animate="show"` and each child gets
// `variants={fadeUp}` to stagger automatically — no per-child delay math needed.
export const staggerContainer = (staggerMs = 0.08, delayMs = 0) => ({
    hidden: {},
    show: {
        transition: { staggerChildren: staggerMs, delayChildren: delayMs },
    },
})

// For elements entering on scroll instead of on mount.
export const viewportFadeUp = {
    initial: 'hidden',
    whileInView: 'show',
    viewport: { once: true, amount: 0.3 },
    variants: fadeUp,
}

export const pageTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
}
