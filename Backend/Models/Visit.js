const mongoose = require('mongoose')

// one row per page-view ping sir — visitorId is an anonymous cookie (survives IP changes),
// ipHash lets admin see "how many visitors behind this network" without ever storing a raw
// IP at rest. user is set when the ping comes from a logged-in session, null otherwise.
const visitSchema = new mongoose.Schema(
    {
        visitorId: {
            type: String,
            required: true,
            index: true,
        },
        ipHash: {
            type: String,
            required: true,
        },
        path: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true }
)

// admin/traffic's date-range queries always filter by createdAt first sir
visitSchema.index({ createdAt: -1 })
visitSchema.index({ visitorId: 1, createdAt: -1 })

module.exports = mongoose.model('Visit', visitSchema)
