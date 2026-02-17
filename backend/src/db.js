import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'inventario',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'SecurePassword123',
    ssl: { rejectUnauthorized: false }, // Required for Supabase
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
