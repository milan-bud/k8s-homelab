-- CRM Tables
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    first_name TEXT, 
    last_name TEXT, 
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number TEXT UNIQUE,
    price_per_night DECIMAL
);

-- Reservations
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES guests(id),
    room_id INTEGER REFERENCES rooms(id),
    check_in DATE, 
    check_out DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finance
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    guest_id INTEGER REFERENCES guests(id),
    amount_net DECIMAL, 
    tax_amount DECIMAL, 
    total_amount DECIMAL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Setup
INSERT INTO rooms (room_number, price_per_night) VALUES ('101', 150.00) ON CONFLICT DO NOTHING;
