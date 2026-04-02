// scripts/seed-admin.js
// One-time script: seeds the admin account from environment variables.
// Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=secret node scripts/seed-admin.js

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function seedAdmin() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, DATABASE_URL } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.');
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const student_id = require('crypto').randomUUID();

    await pool.query(
      `INSERT INTO students (student_id, username, email, password, role, "totalPoints")
       VALUES ($1, $2, $3, $4, 'Admin', 0)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = 'Admin'`,
      [student_id, ADMIN_USERNAME, `${ADMIN_USERNAME}@admin.local`, hashedPassword]
    );

    console.log(`Admin account '${ADMIN_USERNAME}' seeded successfully.`);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
