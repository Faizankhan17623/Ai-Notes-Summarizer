import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

function OpenRoute({ children }) {
    const { token, sessionChecked } = useSelector((state) => state.auth)

    // wait for RestoreSession (App.jsx) sir — avoids a flash of the login/signup form for a
    // user whose cookie session is actually still valid, right before it redirects them away
    if (!sessionChecked) {
        return null
    }
    if (token === null) {
        return children
    } else {
        return <Navigate to="/Dashboard" />
    }
}

export default OpenRoute
