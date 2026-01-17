const express = require('express');
const app = express();
const port = 3000;

// This version number helps us visualize the CI/CD update
const version = "V1.0"; 

app.get('/', (req, res) => {
  res.send(`
    <h1>DevOps Lab - ${version}</h1>
    <p>Running in Kubernetes!</p>
    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
  `);
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
