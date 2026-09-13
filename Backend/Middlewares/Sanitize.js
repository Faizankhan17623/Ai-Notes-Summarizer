// Strips Mongo operator keys ($ne, $gt, $where, ...) and dotted-path keys out of req.body
// sir — the classic NoSQL injection shape is sending { email: { "$ne": null } } instead of
// a string, hoping a route builds a query straight from req.body without validating types
// first. express-validator's isEmail()/isString() etc already reject non-string values on
// every validated route, so this is defense-in-depth for the few fields that reach a Mongo
// query without going through validate() first — not a substitute for validation.
//
// Hand-rolled instead of the express-mongo-sanitize package sir: that package mutates
// req.query, which Express 5 made a read-only getter — it throws on this Express version.
// Only req.body needs it here anyway; every route builds its filters from validated fields
// or req.User (server-derived), never raw req.query, so query/params aren't a vector.
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

const stripOperators = (obj) => {
    if (Array.isArray(obj)) {
        obj.forEach(stripOperators)
        return
    }
    if (!isPlainObject(obj)) return

    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete obj[key]
            continue
        }
        stripOperators(obj[key])
    }
}

exports.sanitizeBody = (req, res, next) => {
    if (isPlainObject(req.body)) {
        stripOperators(req.body)
    }
    next()
}
