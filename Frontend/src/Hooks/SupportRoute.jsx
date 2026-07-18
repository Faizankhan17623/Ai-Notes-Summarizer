import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// Support-only sir — a separate dashboard from Admin's, never shared. An Admin landing here
// (e.g. by typing the URL) is bounced to their own /Admin dashboard, not shown Support's view.
function SupportRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

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
