require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

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

app.put('/lessons/:id', async (req, res) => {
  try {
    const allowed = ['topic', 'location', 'price', 'space', 'image'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'No valid lesson attributes supplied' });
    }
    const result = await db.collection('lesson').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Lesson not found' });
    res.json(result);
  } catch {
    res.status(400).json({ error: 'Invalid lesson ID or update' });
  }
});

// Challenge: server-side search across topic, location, price and availability.
app.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json(await db.collection('lesson').find({}).toArray());

    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\
// Challenge: teachers and their lessons.
app.get('/teachers', async (req, res) => {
  try {
    res.json(await db.collection('teacher').find({}).toArray());
  } catch {
    res.status(500).json({ error: 'Could not retrieve teachers' });
  }
});

app.get('/teachers/:id/lessons', async (req, res) => {
  try {
    const teacher = await db.collection('teacher').findOne({ _id: new ObjectId(req.params.id) });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const ids = teacher.lessonIDs.map(id => new ObjectId(id));
    res.json(await db.collection('lesson').find({ _id: { $in: ids } }).toArray());
  } catch {
    res.status(400).json({ error: 'Invalid teacher ID' });
  }
});

async function start() {');

    const results = await db.collection('lesson').find({
      $or: [
        { topic: { $regex: safeQuery, $options: 'i' } },
        { location: { $regex: safeQuery, $options: 'i' } },
        { $expr: { $regexMatch: { input: { $toString: '$price' }, regex: safeQuery, options: 'i' } } },
        { $expr: { $regexMatch: { input: { $toString: '$space' }, regex: safeQuery, options: 'i' } } }
      ]
    }).toArray();

    res.json(results);
  } catch {
    res.status(500).json({ error: 'Search failed' });
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
