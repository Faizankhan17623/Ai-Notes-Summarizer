const mongoose = require('mongoose')

// up to MAX_ACTIVE_ANNOUNCEMENTS can be `active: true` at once sir (see Backend/controllers/
// Admin.js) — the frontend banner stacks whichever ones are both active AND currently within
// their time window (or untimed).
//
// startAt/endAt are real Date objects sir, never strings. The admin picks both explicitly
// (a <input type="datetime-local"> on the frontend) — startAt must be tomorrow-or-later and
// endAt must be within MAX_WINDOW_DAYS of startAt (both enforced server-side in
// createAnnouncement/editAnnouncementWindow), but the exact moments are the admin's choice, not
// auto-computed. The one string that ever exists is the datetime-local input's ISO-ish value
// on its way in — it's converted to a real Date immediately at the controller boundary via
// `new Date(...)` and never touched as a string again. Every comparison after that point is
// Date <-> Date (`<`/`>`), and display only ever formats a Date (`.toLocaleString()`), never
// parses one — that's deliberate, this app has had recurring bugs from treating dates as strings.
const announcementSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        active: {
            type: Boolean,
            default: true,
        },
        // both null for an untimed announcement (stays active until manually deactivated) sir —
        // both set together for a timed one, never just one, so "timed vs untimed" is a single
        // clean check (`startAt != null`) instead of juggling partial states
        startAt: {
            type: Date,
            default: null,
        },
        endAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Announcement', announcementSchema)
