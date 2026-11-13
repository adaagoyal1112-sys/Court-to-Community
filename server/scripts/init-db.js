// Runs schema.sql against DATABASE_URL (works without psql installed).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema created and courts seeded.');
  await pool.end();
})().catch((err) => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
