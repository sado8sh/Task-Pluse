import mongoose from "mongoose";
import { DB_URI, NODE_ENV } from "../config/env.js";

if (!DB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.<development/production>.local")
}

const connectToDatabase = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log(`Connected to ${NODE_ENV} database`);
    } catch (error) {
        console.error("Error connecting to database:", error.message);
        process.exit(1); // Exit the process with failure
    }
};

export default connectToDatabase;