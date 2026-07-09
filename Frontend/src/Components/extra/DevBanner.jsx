// static "under construction" strip sir — always on top, separate from the DB-driven
// AnnouncementBanner below it. Remove this once the full frontend layout is ready to ship.
const DevBanner = () => {
    return (
        <div className="w-full bg-pink-200 text-richblack-900 text-sm font-semibold py-2 px-4 text-center">
            🚧 This site is under construction — you're seeing a basic layout right now. Please check back in a few hours for the full design.
        </div>
    )
}

export default DevBanner
