import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// LOCATIONS
// ============================================
app.get('/api/locations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM locations ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, address, notes, region, checklist_url, history_url } = req.body;
        const result = await pool.query(
            `INSERT INTO locations (name, type, address, notes, region, checklist_url, history_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, type, address, notes, region, checklist_url, history_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

        const result = await pool.query(
            `UPDATE locations SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/locations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM locations WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VEHICLES
// ============================================
app.get('/api/vehicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles ORDER BY placa');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vehicles', async (req, res) => {
    try {
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
            `INSERT INTO vehicles (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/vehicles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

        const result = await pool.query(
            `UPDATE vehicles SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ASSETS
// ============================================
app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT a.*, at.name as asset_type_name, l.name as location_name
      FROM assets a
      LEFT JOIN asset_types at ON a.asset_type_id = at.id
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.created_at DESC
    `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/assets', async (req, res) => {
    try {
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
            `INSERT INTO assets (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ASSET TYPES
// ============================================
app.get('/api/asset_types', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM asset_types ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CAMERAS
// ============================================
app.get('/api/cameras', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT c.*, l.name as location_name
      FROM cameras c
      LEFT JOIN locations l ON c.location_id = l.id
      ORDER BY c.name
    `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cameras', async (req, res) => {
    try {
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
            `INSERT INTO cameras (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SERVERS
// ============================================
app.get('/api/servers', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT s.*, l.name as location_name
      FROM servers s
      LEFT JOIN locations l ON s.location_id = l.id
      ORDER BY s.name
    `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SUTRAN VISITS
// ============================================
app.get('/api/sutran_visits', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT sv.*, l.name as location_name
      FROM sutran_visits sv
      LEFT JOIN locations l ON sv.location_id = l.id
      ORDER BY sv.visit_date DESC
    `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BRANCH AUDITS
// ============================================
app.get('/api/branch_audits', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT ba.*, l.name as location_name
      FROM branch_audits ba
      LEFT JOIN locations l ON ba.location_id = l.id
      ORDER BY ba.audit_date DESC
    `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GENERIC ROUTES (for remaining tables)
// ============================================
app.get('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const result = await pool.query(`SELECT * FROM ${table}`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
            `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

        const result = await pool.query(
            `UPDATE ${table} SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend API running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
});
