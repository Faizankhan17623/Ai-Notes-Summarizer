const mongoose = require('mongoose')
require('colors')

const connectDB = async () => {
    const uri = process.env.MONGO_DB_URL?.trim()
    if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
        throw new Error('MONGO_DB_URL is missing or invalid. Set a mongodb:// or mongodb+srv:// connection string in the runtime environment. For GitHub Actions, add the MONGO_DB_URL secret to the environment named in scheduled-jobs.yml.')
    }
    try {
        await mongoose.connect(uri)
        console.log('MongoDB connected'.bgCyan.black.bold)
    } catch (error) {
        console.log(`MongoDB connection failed: ${error.message}`.bgRed.white.bold)
        process.exit(1)
    }
}

module.exports = connectDB
