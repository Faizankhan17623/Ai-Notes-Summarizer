import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// Support-only sir — a separate dashboard from Admin's, never shared. An Admin landing
// here (e.g. by typing the URL) is bounced to their own /Admin dashboard, not shown this view.
function SupportRoute({ children }) {
    const { token, user, sessionChecked } = useSelector((state) => state.auth)

    // see PrivateRoute.jsx sir — same reasoning, wait for the cookie-based restore before deciding
    if (!sessionChecked) {
        return null
    }
    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support') {
        return children
    }
    return <Navigate to="/" />
}

export default SupportRoute
