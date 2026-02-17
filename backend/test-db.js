
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // Required for Supabase usually
});

console.log('Testing connection to:', process.env.DB_HOST);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection Error:', err);
    } else {
        console.log('Connection Successful!', res.rows[0]);
    }
    pool.end();
});
