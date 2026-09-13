import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// the normal user dashboard sir — Admin and Support each have their own separate dashboard
// (/Admin, /Support) and don't belong here, same way a plain User is bounced OUT of those by
// AdminRoute/SupportRoute
function PrivateRoute({ children }) {
    const { token, user, sessionChecked } = useSelector((state) => state.auth)

    // wait for RestoreSession (App.jsx) to resolve before deciding sir — otherwise a page
    // refresh briefly shows token === null (nothing persists it anymore, see authSlice.js)
    // and bounces a genuinely logged-in user to /Login before the cookie-based check lands
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
        return <Navigate to="/Support" />
    }
    return children
}

export default PrivateRoute
