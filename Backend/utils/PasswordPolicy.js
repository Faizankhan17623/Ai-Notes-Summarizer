// shared strong-password rule sir — used by createUser directly and by the validation
// rule chains in Middlewares/ValidationRules.js, kept in one place so both never drift apart
const isStrongPassword = (password) =>
    typeof password === 'string'
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)

module.exports = { isStrongPassword }
