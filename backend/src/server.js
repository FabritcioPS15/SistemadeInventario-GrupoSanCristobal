import express from 'express';
import cors from 'cors';
import { supabase } from './supabase.js';

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
        const { data, error } = await supabase.from('locations').select('*').order('name');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, address, notes, region, checklist_url, history_url } = req.body;
        const { data, error } = await supabase
            .from('locations')
            .insert([{ name, type, address, notes, region, checklist_url, history_url }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('locations')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/locations/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('locations').delete().eq('id', req.params.id);
        if (error) throw error;
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
        const { data, error } = await supabase.from('vehicles').select('*').order('placa');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vehicles', async (req, res) => {
    try {
        const { data, error } = await supabase.from('vehicles').insert([req.body]).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/vehicles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('vehicles').update(req.body).eq('id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('vehicles').delete().eq('id', req.params.id);
        if (error) throw error;
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
        const { data, error } = await supabase
            .from('assets')
            .select(`
                *,
                asset_type_name:asset_types(name),
                location_name:locations(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the joined data to match previous API response
        const formattedData = data.map(item => ({
            ...item,
            asset_type_name: item.asset_type_name?.name,
            location_name: item.location_name?.name
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/assets', async (req, res) => {
    try {
        const { data, error } = await supabase.from('assets').insert([req.body]).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ASSET TYPES
// ============================================
app.get('/api/asset_types', async (req, res) => {
    try {
        const { data, error } = await supabase.from('asset_types').select('*').order('name');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CAMERAS
// ============================================
app.get('/api/cameras', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cameras')
            .select('*, location_name:locations(name)')
            .order('name');

        if (error) throw error;

        const formattedData = data.map(item => ({
            ...item,
            location_name: item.location_name?.name
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cameras', async (req, res) => {
    try {
        const { data, error } = await supabase.from('cameras').insert([req.body]).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SERVERS
// ============================================
app.get('/api/servers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('servers')
            .select('*, location_name:locations(name)')
            .order('name');

        if (error) throw error;

        const formattedData = data.map(item => ({
            ...item,
            location_name: item.location_name?.name
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SUTRAN VISITS
// ============================================
app.get('/api/sutran_visits', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sutran_visits')
            .select('*, location_name:locations(name)')
            .order('visit_date', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(item => ({
            ...item,
            location_name: item.location_name?.name
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BRANCH AUDITS
// ============================================
app.get('/api/branch_audits', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('branch_audits')
            .select('*, location_name:locations(name)')
            .order('audit_date', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(item => ({
            ...item,
            location_name: item.location_name?.name
        }));

        res.json(formattedData);
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
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { data, error } = await supabase.from(table).insert([req.body]).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const { data, error } = await supabase.from(table).update(req.body).eq('id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend API running on port ${PORT}`);
    console.log(`📊 Connected to Supabase: ${process.env.SUPABASE_URL}`);
});
