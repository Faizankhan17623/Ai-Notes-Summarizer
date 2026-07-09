const mongoose = require('mongoose')
require('colors')

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL)
        console.log('MongoDB connected'.bgCyan.black.bold)
    } catch (error) {
        console.log(`MongoDB connection failed: ${error.message}`.bgRed.white.bold)
        process.exit(1)
    }
}

module.exports = connectDB
