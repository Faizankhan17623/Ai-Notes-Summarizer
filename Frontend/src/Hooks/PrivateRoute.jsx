import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// the normal user dashboard sir — Admin and Support each have their own separate dashboard
// (/Admin, /Support) and don't belong here, same way a plain User is bounced OUT of those by
// AdminRoute/SupportRoute
function PrivateRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support' || user?.role === 'Billing') {
        return <Navigate to="/Support" />
    }
    return children
}

export default PrivateRoute
