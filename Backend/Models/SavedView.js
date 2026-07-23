const mongoose = require('mongoose')

// one row per saved filter combo sir — lets an admin/support agent name and re-apply a
// filter set on one of the admin list pages instead of re-entering search/status/role
// filters every visit. Personal to the user who saved it (not shared team-wide), same
// scoping as e.g. a browser bookmark.
const savedViewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // which admin list page this view applies to sir — the frontend only ever offers
        // views matching the page it's currently on
        page: {
            type: String,
            enum: ['users', 'payments', 'audit', 'ai-logs'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        // the actual filter values sir — shape depends on `page` (e.g. { search, roleFilter }
        // for users, { model, success, userSearch } for ai-logs), read back verbatim by the
        // frontend and applied to that page's existing filter state
        filters: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    { timestamps: true }
)

savedViewSchema.index({ user: 1, page: 1, createdAt: -1 })

module.exports = mongoose.model('SavedView', savedViewSchema)
