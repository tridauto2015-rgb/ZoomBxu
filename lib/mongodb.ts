import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoparts'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

declare global {
  var mongoose: any
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  })
}

export default async function connectDB() {
  if (cached) {
    return cached
  }
  return cached
}
