import mongoose from "mongoose";
import { config } from "./env";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};
