const jwt = require('jsonwebtoken')
const User = require('../Models/User')

exports.Auth = async (req, res, next) => {
    try {

        const token =
            req.cookies?.token ||
            req.body?.token ||
            req.header('Authorization')?.replace('Bearer ', '')

        // not case sir — no token was sent
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token is missing, please log in',
            })
        }

        // verify the token sir
        const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY)

        // not case sir — token did not decode to anything usable
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token, please log in again',
            })
        }

        // load the live account state sir — role and ban status must be FRESH from the DB,
        // never trusted from a token that could be days old
        const user = await User.findById(decoded.id).select('role isBanned banReason')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Account not found, please log in again',
            })
        }

        // NOT blocked here anymore sir — a banned user is allowed to authenticate so they can
        // reach their locked dashboard (profile, appeal, logout) instead of being turned away
        // at the door with no way to ever contest it. Actual route-level blocking now happens
        // per-route via blockIfBanned below, applied to every route except the few a banned
        // user still needs (profile, appeal, logout, refresh-token).
        req.User = decoded
        req.User.role = user.role
        req.User.isBanned = user.isBanned
        req.User.banReason = user.banReason

        next()
    } catch (error) {
        console.log(error.message)
        return res.status(401).json({
            success: false,
            message: 'Failed to authenticate',
        })
    }
}

// run AFTER Auth on every route that a banned user should NOT be able to use sir — Auth
// itself no longer blocks banned users (see above), this is the actual enforcement point.
// Deliberately opt-in per route rather than opt-out, so a newly added route is BLOCKED by
// default for banned users unless someone explicitly decides otherwise.
exports.blockIfBanned = (req, res, next) => {
    if (req?.User?.isBanned) {
        return res.status(403).json({
            success: false,
            message: req.User.banReason
                ? `Your account has been suspended: ${req.User.banReason}`
                : 'Your account has been suspended, please contact support',
        })
    }
    next()
}

// admin gate sir — runs AFTER Auth, which already loaded the role fresh from the DB
// so a demoted admin loses access instantly, no extra query needed here
exports.isAdmin = (req, res, next) => {
    if (req?.User?.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'This route is for administrators only',
        })
    }
    next()
}

// support gate sir — Support AND Admin both pass, for the view/help routes
exports.isSupport = (req, res, next) => {
    if (!['Support', 'Admin'].includes(req?.User?.role)) {
        return res.status(403).json({
            success: false,
            message: 'This route is for the support team and administrators only',
        })
    }
    next()
}
