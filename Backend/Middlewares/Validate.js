const { validationResult } = require('express-validator')

// runs after an express-validator rule chain (body(...), param(...), etc.) has populated
// req's internal error state sir — collects the first problem and responds in the same
// { success, field, message } shape already used by hand-written 400s across controllers/user.js
exports.validate = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const first = errors.array()[0]
        return res.status(400).json({
            success: false,
            field: first.path,
            message: first.msg,
        })
    }
    next()
}
