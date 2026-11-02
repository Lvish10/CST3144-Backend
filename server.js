require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} | ${req.originalUrl}`);
  next();
});

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/images', (req, res) => res.status(404).json({ error: 'Image not found' }));

app.get('/', (req, res) => {
  res.json({ message: 'After-school API is running' });
});

app.get('/lessons', async (req, res) => {
  try {
    res.json(await db.collection('lesson').find({}).toArray());
  } catch {
    res.status(500).json({ error: 'Could not retrieve lessons' });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const { name, phone, lessonIDs, numberOfSpaces, items = [] } = req.body;
    if (!name || !phone || !Array.isArray(lessonIDs) || !numberOfSpaces) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    const result = await db.collection('order').insertOne({
      name,
      phone,
      lessonIDs,
      numberOfSpaces,
      items,
      createdAt: new Date()
    });
    res.status(201).json({ message: 'Order saved', orderId: result.insertedId });
  } catch {
    res.status(500).json({ error: 'Could not save order' });
  }
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
