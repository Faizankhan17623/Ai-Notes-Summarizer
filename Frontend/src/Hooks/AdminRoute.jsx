import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// Admin-only sir — Support has its own separate dashboard at /Support (see SupportRoute),
// never this one. A Support user landing here (e.g. by typing the URL) is bounced to
// their own dashboard, not shown anything Admin-only.
function AdminRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Support') {
        return <Navigate to="/Support" />
    }
    if (user?.role === 'Admin') {
        return children
    }
    return <Navigate to="/" />
}

export default AdminRoute
