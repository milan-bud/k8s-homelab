const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Middleware to parse JSON and serve your frontend files
app.use(express.json());
app.use(express.static('public')); 

// PostgreSQL Connection
// Uses DATABASE_URL from your K8s Secret
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
});

// Test Database Connection on Startup
pool.connect((err, client, release) => {
    if (err) {
        return console.error('CRITICAL: Could not connect to PostgreSQL', err.stack);
    }
    console.log('CONNECTED: Database connection established.');
    release();
});

// --- 1. HEALTH CHECK (For Kubernetes Liveness/Readiness) ---
app.get('/health', (req, res) => res.status(200).send('OK'));

// --- 2. GUESTS API ---
app.get('/api/guests', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error("FETCH GUESTS ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch guests" });
    }
});

// --- 3. BOOKINGS API (Fixed & Consolidated) ---
app.post('/api/bookings', async (req, res) => {
    // Log exactly what arrived from the browser for debugging
    console.log("DEBUG: Incoming booking request body:", req.body);
    
    const { guest_id, room_num, check_in, check_out } = req.body;
    
    try {
        // Step A: Find the Internal ID for the room number provided (e.g., '101')
        const roomRes = await pool.query('SELECT id FROM rooms WHERE room_number = $1', [room_num]);
        
        if (roomRes.rows.length === 0) {
            console.error(`VALIDATION ERROR: Room number "${room_num}" not found in 'rooms' table.`);
            return res.status(404).json({ error: `Room ${room_num} does not exist. Please add it to the database first.` });
        }
        
        const roomId = roomRes.rows[0].id;
        console.log(`DEBUG: Found Internal Room ID: ${roomId} for Room Number: ${room_num}`);

        // Step B: Insert the booking
        // We use default dates if the frontend sends empty values to prevent crashes
        const finalCheckIn = check_in || new Date().toISOString().split('T')[0];
        const finalCheckOut = check_out || new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const result = await pool.query(
            'INSERT INTO bookings (guest_id, room_id, check_in, check_out) VALUES ($1, $2, $3, $4) RETURNING id',
            [guest_id || 1, roomId, finalCheckIn, finalCheckOut]
        );

        console.log(`SUCCESS: Booking created with ID: ${result.rows[0].id}`);
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("POSTGRES INSERT ERROR:", err.message);
        // If this fails, it's likely a Foreign Key violation (guest_id doesn't exist)
        res.status(500).send("Database error: " + err.message);
    }
});

// --- 4. INVOICES API ---
app.post('/api/invoices', async (req, res) => {
    const { booking_id, amount_net } = req.body;
    const TAX_RATE = 0.20; 
    
    try {
        const booking = await pool.query('SELECT guest_id FROM bookings WHERE id = $1', [booking_id]);
        if (booking.rows.length === 0) return res.status(404).send("Booking ID not found");

        const guest_id = booking.rows[0].guest_id;
        const net = parseFloat(amount_net);
        const tax = net * TAX_RATE;
        const total = net + tax;

        const result = await pool.query(
            `INSERT INTO invoices (booking_id, guest_id, amount_net, tax_amount, total_amount) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [booking_id, guest_id, net, tax, total]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("INVOICE ERROR:", err.message);
        res.status(500).send("Invoice error: " + err.message);
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------------`);
    console.log(`Hotel App Server is LIVE on port ${PORT}`);
    console.log(`-----------------------------------------------`);
});
