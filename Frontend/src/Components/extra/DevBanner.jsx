// static "under construction" strip sir — always on top, separate from the DB-driven
// AnnouncementBanner below it. Remove this once the full frontend layout is ready to ship.
// text scrolls across continuously via the marquee keyframes in index.css sir
const MESSAGE = "🚧 This site is under construction — you're seeing a basic layout right now. Please check back in a few hours for the full design. 🚧"

const DevBanner = () => {
    return (
        <div className="w-full bg-pink-200 text-richblack-900 text-sm font-semibold py-2 overflow-hidden whitespace-nowrap">
            <div className="inline-flex animate-marquee">
                <span className="px-8">{MESSAGE}</span>
                <span className="px-8">{MESSAGE}</span>
            </div>
        </div>
    )
}

export default DevBanner
