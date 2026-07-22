// runs ONCE before the whole test run sir (jest's globalSetup, not per-file) — starts a real
// but ephemeral, in-process MongoDB via mongodb-memory-server, so tests never touch the real
// MONGO_DB_URL/production data and need no separate test-database setup. The instance handle
// is stashed on `global` for globalTeardown.js to stop afterward; MONGO_DB_URL is overwritten
// so every controller that reads process.env.MONGO_DB_URL (Installation/mongo.js) connects to
// this instance transparently, no controller code needs to know it's running under test.
const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = async () => {
    const mongod = await MongoMemoryServer.create()
    global.__MONGOD__ = mongod
    process.env.MONGO_DB_URL = mongod.getUri()
    // never real secrets in tests sir — JWT_PRIVATE_KEY must exist for signAccessToken to work
    // but its value is meaningless outside this test run
    process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'test-jwt-secret-not-for-real-use'
    process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-not-for-real-use'
    // utils/Razorpay.js's `isConfigured` is read ONCE at module-require time sir — these must
    // be set before Routes/Payment.js (and therefore controllers/Payment.js) is ever required,
    // which globalSetup running before Jest loads any test file guarantees. Fake but
    // well-formed values — payments.test.js never calls the real Razorpay API (orders are
    // seeded directly into the test DB), only exercises verifyPayment's own HMAC check, which
    // signs/verifies against this same RAZORPAY_KEY_SECRET regardless of whether it's real
    process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_fake_key_id'
    process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test-razorpay-secret-not-for-real-use'
    process.env.NODE_ENV = 'test'
}
