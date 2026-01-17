import mongoose from 'mongoose'
import config from './config.js'

let isConnected = false

export const connectDB = async () => {
    if (isConnected) {
        return
    }

    if (!config.mongodbUri) {
        throw new Error('MONGODB_URI is not defined in environment variables')
    }

    try {
        const db = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })

        isConnected = db.connection.readyState === 1
        console.log('✅ MongoDB connected successfully')
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error)
        throw error
    }
}

export default connectDB
