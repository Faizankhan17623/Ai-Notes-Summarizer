import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// blocks Admin/Support from a User-only page sir — unlike AdminRoute/SupportRoute this does
// NOT require a token, since the wrapped page (Pricing) is public and must still work for
// logged-out visitors and regular Users. Only an AUTHENTICATED staff account gets bounced to
// their own dashboard; everyone else (logged out, or a regular User) sees the page normally.
function NoStaffRoute({ children }) {
    const { user } = useSelector((state) => state.auth)

    if (user?.role === 'Admin') {
        return <Navigate to="/Admin" />
    }
    if (user?.role === 'Support') {
        return <Navigate to="/Support" />
    }
    return children
}

export default NoStaffRoute
