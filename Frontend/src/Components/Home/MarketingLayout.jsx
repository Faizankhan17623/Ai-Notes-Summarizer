import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

// Shared shell for standalone public pages (Pricing, Features, Solutions, Resources) sir —
// same header/footer as the homepage, since these are one click away from it via the nav dropdowns
const MarketingLayout = ({ children }) => (
    <div className="bg-richblack-900 min-h-screen flex flex-col">
        <Navbar showMegaMenu />
        <div className="flex-1">
            {children}
        </div>
        <Footer />
    </div>
)

export default MarketingLayout
