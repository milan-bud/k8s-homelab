const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Connect using Environment Variables (Best Practice)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.get('/', async (req, res) => {
  try {
    // Query the database
    const result = await pool.query('SELECT * FROM quotes');

    let html = `<h1>DevOps Lab - Database Connected!</h1>`;
    html += `<ul>`;
    result.rows.forEach(row => {
       html += `<li>${row.text}</li>`;
    });
    html += `</ul>`;

    res.send(html);
  } catch (err) {
    res.send(`<h1>Error</h1><p>${err.message}</p>`);
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
