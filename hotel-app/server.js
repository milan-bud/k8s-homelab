const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serves your index.html

// PostgreSQL Connection using the URL from your K8s Secret
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
});

// --- CRM & GUESTS ---
app.get('/api/guests', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch guests" });
    }
});

// --- BOOKINGS ---
app.post('/api/bookings', async (req, res) => {
    const { guest_id, room_num, check_in, check_out } = req.body;
    try {
        // Simple logic: find room ID by number, then insert booking
        const roomRes = await pool.query('SELECT id FROM rooms WHERE room_number = $1', [room_num]);
        if (roomRes.rows.length === 0) return res.status(404).send("Room not found");
        
        const roomId = roomRes.rows[0].id;
        const result = await pool.query(
            'INSERT INTO bookings (guest_id, room_id, check_in, check_out) VALUES ($1, $2, $3, $4) RETURNING id',
            [guest_id, roomId, check_in, check_out]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- FINANCE & INVOICING ---
app.post('/api/invoices', async (req, res) => {
    const { booking_id, amount_net } = req.body;
    const TAX_RATE = 0.20; // 20%
    
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
        res.status(500).send("Invoice error: " + err.message);
    }
});

app.use(express.json()); // Allows the app to read JSON from the browser

app.post('/api/bookings', async (req, res) => {
  try {
    const { room_id, guest_name } = req.body;
    await pool.query(
      'INSERT INTO bookings (room_id, guest_name) VALUES ($1, $2)',
      [room_id, guest_name]
    );
    res.status(201).json({ message: "Booking Created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// --- K8S HEALTH CHECK ---
app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hotel App running on port ${PORT}`));
