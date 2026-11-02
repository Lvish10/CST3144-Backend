require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'After-school API is running' });
});

async function start() {
  await client.connect();
  db = client.db(process.env.DB_NAME || 'after_school');
  console.log(`Connected to MongoDB: ${db.databaseName}`);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
