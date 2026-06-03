import dotenv from "dotenv";
dotenv.config();

const JWT_USER_PASSWORD = process.env.JWT_SECRET || process.env.JWT_PASSWORD;

export default {
  JWT_USER_PASSWORD,
};