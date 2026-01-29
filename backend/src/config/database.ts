import mongoose from "mongoose";
import { config } from "./env";

let isConnected = false;
let connectionRetryTimeout: NodeJS.Timeout | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected');
      isConnected = true;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
      scheduleReconnect();
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      isConnected = false;
    });

    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error("MongoDB connection failed", error);
    isConnected = false;
    scheduleReconnect();
  }
};

function scheduleReconnect() {
  if (connectionRetryTimeout) {
    clearTimeout(connectionRetryTimeout);
  }

  connectionRetryTimeout = setTimeout(async () => {
    console.log('Attempting MongoDB reconnection...');
    try {
      await mongoose.connect(config.MONGODB_URI);
    } catch (error) {
      console.error('MongoDB reconnection failed:', error);
      scheduleReconnect();
    }
  }, 5000);
}

export const isDBConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

export const disconnectDB = async (): Promise<void> => {
  if (connectionRetryTimeout) {
    clearTimeout(connectionRetryTimeout);
  }
  await mongoose.disconnect();
};
