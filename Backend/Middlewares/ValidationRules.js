// central place for every express-validator rule array sir — mirrors how RateLimit.js
// centralizes all the limiters. Field names below are verified against each controller's
// actual req.body/req.params destructuring, not assumed
const { body, param } = require('express-validator')
const { isStrongPassword } = require('../utils/PasswordPolicy')

const strongPasswordMessage = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character'

exports.registerRules = [
    body('firstName').trim().notEmpty().isLength({ max: 50 }),
    body('lastName').trim().notEmpty().isLength({ max: 50 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').custom(isStrongPassword).withMessage(strongPasswordMessage),
    body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
]

exports.loginRules = [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty(),
]

exports.sendOtpRules = [body('email').trim().isEmail().normalizeEmail()]
exports.forgotPasswordRules = [body('email').trim().isEmail().normalizeEmail()]

exports.contactRules = [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('message').trim().notEmpty().isLength({ min: 10, max: 2000 }),
]

exports.resetPasswordRules = [
    body('token').trim().notEmpty(),
    body('newPassword').custom(isStrongPassword).withMessage(strongPasswordMessage),
    body('confirmNewPassword').custom((v, { req }) => v === req.body.newPassword).withMessage('Passwords do not match'),
]

exports.updatePasswordRules = [
    body('oldPassword').notEmpty(),
    body('newPassword').custom(isStrongPassword).withMessage(strongPasswordMessage),
    body('confirmNewPassword').custom((v, { req }) => v === req.body.newPassword).withMessage('Passwords do not match'),
]

exports.updateFirstNameRules = [body('firstName').trim().notEmpty().isLength({ max: 50 })]
exports.updateLastNameRules = [body('lastName').trim().notEmpty().isLength({ max: 50 })]

exports.appealRules = [body('message').trim().notEmpty().isLength({ max: 1000 })]

exports.organizeNoteRules = [
    param('noteId').isMongoId(),
    body('tags').optional().isArray({ max: 20 }),
    body('tags.*').optional().isString().trim().isLength({ max: 40 }),
    body('folder').optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('pinned').optional().isBoolean(),
]

exports.editNoteRules = [
    param('noteId').isMongoId(),
    body('title').optional().isString().trim().isLength({ max: 80 }),
    body('rawText').optional().isString().trim().notEmpty(),
]
exports.getNoteVersionsRules = [param('noteId').isMongoId()]
exports.restoreNoteVersionRules = [param('noteId').isMongoId(), param('versionId').isMongoId()]

// capped at 100 sir — same reasoning as bulkBanUsersRules below, bounds one request's DB work
exports.bulkDeleteNotesRules = [
    body('noteIds').isArray({ min: 1, max: 100 }),
    body('noteIds.*').isMongoId(),
]
exports.bulkAddTagRules = [
    body('noteIds').isArray({ min: 1, max: 100 }),
    body('noteIds.*').isMongoId(),
    body('tag').trim().notEmpty().isLength({ max: 40 }),
]

// accepts EITHER a subscription plan OR a credit-pack key sir — createOrder branches on which one is present
exports.createOrderRules = [
    body('plan').optional().isIn(['Pro', 'ProMax']),
    body('packKey').optional().isIn(['small', 'medium', 'large']),
    body().custom((value) => {
        if (!value.plan && !value.packKey) {
            throw new Error('A plan or a credit pack is required')
        }
        return true
    }),
]
exports.verifyPaymentRules = [
    body('razorpay_order_id').trim().notEmpty(),
    body('razorpay_payment_id').trim().notEmpty(),
    body('razorpay_signature').trim().notEmpty(),
]

exports.banUserRules = [param('userId').isMongoId(), body('banReason').optional().trim().isLength({ max: 300 })]
exports.setRoleRules = [param('userId').isMongoId(), body('role').isIn(['User', 'Support', 'Billing'])]

// capped at 100 sir — a Support/Admin triage batch is never realistically bigger than a
// page or two of the Users table; the cap just bounds one request's DB work, matching how
// getUsers itself paginates at 20/page
exports.bulkBanUsersRules = [
    body('userIds').isArray({ min: 1, max: 100 }),
    body('userIds.*').isMongoId(),
    body('banReason').optional().trim().isLength({ max: 300 }),
]
exports.bulkSetRoleRules = [
    body('userIds').isArray({ min: 1, max: 100 }),
    body('userIds.*').isMongoId(),
    body('role').isIn(['User', 'Support', 'Billing']),
]

exports.createSavedViewRules = [
    body('page').isIn(['users', 'payments', 'audit', 'ai-logs']),
    body('name').trim().notEmpty().isLength({ max: 60 }),
    body('filters').custom((v) => typeof v === 'object' && v !== null).withMessage('Filters are required'),
]
exports.deleteSavedViewRules = [param('viewId').isMongoId()]
exports.userActivityRules = [param('messageId').isMongoId()]

exports.createChatRules = [body('noteId').isMongoId()]
exports.sendMessageRules = [param('chatId').isMongoId(), body('message').trim().notEmpty().isLength({ max: 4000 })]
exports.regenerateReplyRules = [param('chatId').isMongoId()]

exports.reviewFlashcardRules = [param('id').isMongoId(), body('rating').isIn(['again', 'hard', 'good', 'easy'])]
exports.attemptQuizRules = [param('id').isMongoId(), body('answers').isArray({ min: 1 })]

// url is optional here sir — /summarize also accepts pasted text or a file, this only
// validates the shape of the url field when the article tab actually sends one
exports.summarizeRules = [body('url').optional().trim().isURL({ require_protocol: true })]
