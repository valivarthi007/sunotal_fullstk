import mongoose from 'mongoose';

export interface DbConnectOptions {
  uri?: string;
  serviceName?: string;
}

export async function connectDatabase(options: DbConnectOptions = {}) {
  const {
    uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sunotal?retryWrites=true&w=majority',
    serviceName = 'Microservice'
  } = options;

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    });
    console.log(`🍃 [${serviceName}] MongoDB connected (Replica Set / Pool size: 50)`);
    return conn;
  } catch (error) {
    console.error(`❌ [${serviceName}] MongoDB Connection Error:`, error);
    throw error;
  }
}
