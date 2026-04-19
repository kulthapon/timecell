const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "TimeCell_db",
  port: 3306,
  waitForConnections: true
});

module.exports = pool;

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL");
    conn.release();
  } catch (err) {
    console.error("MySQL connection error:", err.message);
  }
})();

module.exports = pool;