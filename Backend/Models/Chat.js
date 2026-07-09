const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema(
    {
        // the owner of this chat sir — every query must filter by this
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // the note this chat is grounded in sir — the AI only ever talks about this note's content
        note: {
            type: mongoose.Schema.ObjectId,
            ref: 'Note',
            required: true,
            index: true
        },
        // shown in the chat list sidebar sir
        title: {
            type: String,
            default: 'New Chat',
            trim: true,
            maxlength: 80
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ['user', 'assistant'],
                    required: true
                },
                content: {
                    type: String,
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    { timestamps: true }
)

module.exports = mongoose.model('Chat', chatSchema)
