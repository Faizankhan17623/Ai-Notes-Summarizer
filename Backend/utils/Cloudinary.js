const cloudinary = require('cloudinary').v2

// stub-friendly sir, same pattern as utils/Razorpay.js — configured lazily from env, so this
// file can be required safely before real credentials exist. isConfigured lets callers (bug
// report / feature suggestion uploads) skip the upload attempt entirely and say so plainly
// instead of throwing when CLOUDINARY_* isn't set yet
const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
)

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    })
}

// CLOUDINARY_UPLOAD_FOLDER sir — the folder name the user will provide alongside their API
// key; defaults to something sane so a missing env var doesn't dump uploads into Cloudinary's
// account root
const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'notewise-uploads'

// uploads a Buffer sir — express-fileupload's useTempFiles:false setup (Backend/index.js)
// hands controllers an in-memory Buffer (file.data), never a filesystem path, so this takes
// a Buffer directly via upload_stream rather than the path-based cloudinary.uploader.upload
const uploadBuffer = (buffer, { folder = UPLOAD_FOLDER, resourceType = 'image' } = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => (error ? reject(error) : resolve(result))
        )
        stream.end(buffer)
    })
}

module.exports = { isConfigured, uploadBuffer, UPLOAD_FOLDER }
