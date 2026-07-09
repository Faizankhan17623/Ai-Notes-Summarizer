const mongoose = require('mongoose')

// only one should be `active: true` at a time sir — the frontend banner reads that one
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
        createdBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Announcement', announcementSchema)
