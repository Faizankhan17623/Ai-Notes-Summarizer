import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// Support/Billing-only sir — a separate dashboard from Admin's, never shared. An Admin landing
// here (e.g. by typing the URL) is bounced to their own /Admin dashboard, not shown this view.
// Billing shares this dashboard shell with Support (same nav) but sees a refund button on
// Payments that Support doesn't — gated inside Payments.jsx by user.role, not by a route split.
function SupportRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token === null) {
        return <Navigate to="/Login" />
    }
    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support' || user?.role === 'Billing') {
        return children
    }
    return <Navigate to="/" />
}

export default SupportRoute
