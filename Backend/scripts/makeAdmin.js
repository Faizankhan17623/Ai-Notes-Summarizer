// run with: node scripts/makeAdmin.js someone@example.com
require('dotenv').config({ quiet: true })
const mongoose = require('mongoose')
const User = require('../Models/User')

const email = process.argv[2]

if (!email) {
    console.log('Usage: node scripts/makeAdmin.js <email>')
    process.exit(1)
}

mongoose.connect(process.env.MONGO_DB_URL)
    .then(async () => {
        const user = await User.findOneAndUpdate({ email }, { role: 'Admin' }, { returnDocument: 'after' })
        if (!user) {
            console.log(`No user found with email ${email}`)
        } else {
            console.log(`${user.email} is now an Admin`)
        }
        process.exit(0)
    })
    .catch((err) => {
        console.log('Failed:', err.message)
        process.exit(1)
    })
