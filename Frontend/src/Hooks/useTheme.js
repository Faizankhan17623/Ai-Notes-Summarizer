import { useEffect, useState } from 'react'

// same localStorage.setItem(key, JSON.stringify(value)) convention already used for
// token/user in Services/operations/Auth.js sir
const useTheme = () => {
    const [theme, setThemeState] = useState(() => {
        const saved = localStorage.getItem('theme')
        return saved ? JSON.parse(saved) : 'dark'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', JSON.stringify(theme))
    }, [theme])

    const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

    return { theme, toggleTheme }
}

export default useTheme
