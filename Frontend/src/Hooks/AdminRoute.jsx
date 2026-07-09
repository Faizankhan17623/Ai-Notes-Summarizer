import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

function AdminRoute({ children }) {
    const { token, user } = useSelector((state) => state.auth)

    if (token !== null && ['Admin', 'Support'].includes(user?.role)) {
        return children
    } else {
        return <Navigate to="/" />
    }
}

export default AdminRoute
