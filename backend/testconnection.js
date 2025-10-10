// backend/testConnection.js
import pool from "./db.js";

async function testDB() {
  const result = await pool.query("SELECT NOW()");
  console.log("Database time:", result.rows[0]);
  process.exit();
}

testDB();