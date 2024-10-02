import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Create the MySQL connection using environment variables
export const dbPromise = mysql.createPool({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
export const initDb = async () => {
  try {
    const connection = await dbPromise.getConnection();
    console.log("Database connection established");
    connection.release(); // Release the connection back to the pool
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};
