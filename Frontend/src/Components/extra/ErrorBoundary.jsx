import { Component } from 'react'

// catches uncaught render-time errors anywhere below it sir — without this, ANY unhandled
// exception during render (a malformed API payload, a third-party lib throwing, a bad prop)
// unmounts the entire React tree and leaves a blank white screen with no way to recover
// short of a manual hard refresh. React error boundaries only work as a class component
// (there's no hook equivalent for getDerivedStateFromError/componentDidCatch yet).
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        console.log('Unhandled render error caught by ErrorBoundary:', error, info?.componentStack)
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-richblack-900 flex items-center justify-center px-4">
                    <div className="max-w-md w-full text-center">
                        <p className="text-richblack-5 text-xl font-bold mb-2">Something went wrong</p>
                        <p className="text-richblack-300 text-sm mb-6">
                            This page hit an unexpected error. Reloading usually fixes it — your notes and
                            data are safe either way.
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="bg-yellow-50 text-richblack-900 rounded-md px-5 py-2 font-semibold cursor-pointer"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
