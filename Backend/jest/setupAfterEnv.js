// runs inside every test file's environment sir (jest's setupFilesAfterEnv) — connects
// mongoose to the in-memory server globalSetup.js already started and pointed
// MONGO_DB_URL at, using the SAME connectDB() the real app uses so a connection-string
// bug would actually surface in tests too. Clears every collection between tests so one
// test's data never leaks into the next.
const mongoose = require('mongoose')
const connectDB = require('../Installation/mongo')

beforeAll(async () => {
    await connectDB()
})

afterEach(async () => {
    const collections = await mongoose.connection.db.collections()
    for (const collection of collections) {
        await collection.deleteMany({})
    }
})

afterAll(async () => {
    await mongoose.connection.close()
})
