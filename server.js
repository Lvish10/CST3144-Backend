require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;
let requestNumber = 0;

// Small helper so every request can be followed from start to finish.
function nextRequestId() {
  requestNumber += 1;
  return `REQ-${String(requestNumber).padStart(4, '0')}`;
}

function logStep(req, label, message, details = null) {
  const id = req.requestId || 'STARTUP';
  console.log(`[${id}] [${label}] ${message}`);
  if (details) {
    console.log(`[${id}]            `, details);
  }
}

function maskName(name = '') {
  return name
    .split(' ')
    .map(part => part ? part[0] + '*'.repeat(Math.max(1, part.length - 1)) : '')
    .join(' ');
}

function maskPhone(phone = '') {
  const text = String(phone);
  return text.length <= 2 ? '**' : '*'.repeat(text.length - 2) + text.slice(-2);
}

app.use(express.json());

// CORS lets the GitHub Pages frontend call the Render backend.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Detailed logger middleware for every request.
app.use((req, res, next) => {
  req.requestId = nextRequestId();
  req.startedAt = Date.now();

  console.log('\n------------------------------------------------------------');
  logStep(req, 'REQUEST', 'Request started');
  logStep(req, 'INFO', `Method: ${req.method}`);
  logStep(req, 'INFO', `URL: ${req.originalUrl}`);
  logStep(req, 'INFO', 'The browser/frontend has sent a request to Express.');

  res.on('finish', () => {
    const duration = Date.now() - req.startedAt;
    logStep(req, 'RESPONSE', `HTTP status: ${res.statusCode}`);
    logStep(req, 'SUCCESS', `Request completed in ${duration} ms`);
    console.log('------------------------------------------------------------\n');
  });

  next();
});

// Explain static image requests before Express serves the file.
app.use('/images', (req, res, next) => {
  logStep(req, 'ROUTE', 'Static lesson image request');
  logStep(req, 'CODE', "server.js -> express.static('/public/images')");
  logStep(req, 'INFO', `Requested image: ${req.path}`);
  logStep(req, 'INFO', 'Express will look inside backend/public/images.');
  next();
});

// Required static file middleware.
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Missing-image fallback.
app.use('/images', (req, res) => {
  logStep(req, 'WARNING', 'Image was not found by static middleware.');
  logStep(req, 'RESPONSE', 'Returning JSON error with HTTP 404.');
  res.status(404).json({ error: 'Image not found' });
});

app.get('/', (req, res) => {
  logStep(req, 'ROUTE', 'GET /');
  logStep(req, 'INFO', 'Simple health check for the AfterClass API.');
  res.json({ message: 'After-school API is running' });
});

// Return every lesson from MongoDB Atlas.
app.get('/lessons', async (req, res) => {
  try {
    logStep(req, 'ROUTE', 'GET /lessons');
    logStep(req, 'CODE', "server.js -> app.get('/lessons', ...)");
    logStep(req, 'INFO', 'The frontend is asking for all lesson records.');
    logStep(req, 'DATABASE', 'Database: after_school');
    logStep(req, 'DATABASE', 'Collection: lesson');
    logStep(req, 'DATABASE', 'MongoDB operation: find({})');

    const lessons = await db.collection('lesson').find({}).toArray();

    logStep(req, 'DATABASE', `Documents found: ${lessons.length}`);
    logStep(req, 'RESPONSE', 'Returning lesson objects to the frontend as JSON.');

    res.json(lessons);
  } catch (error) {
    logStep(req, 'ERROR', 'Could not read the lesson collection.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Could not retrieve lessons' });
  }
});

// Save a new order after checkout.
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, lessonIDs, numberOfSpaces, items = [] } = req.body;

    logStep(req, 'ROUTE', 'POST /orders');
    logStep(req, 'CODE', "server.js -> app.post('/orders', ...)");
    logStep(req, 'INFO', 'The Vue checkout() method is submitting a new order.');
    logStep(req, 'INFO', 'Safe order summary', {
      customer: maskName(name),
      phone: maskPhone(phone),
      lessonTypes: Array.isArray(lessonIDs) ? lessonIDs.length : 0,
      totalSpaces: numberOfSpaces
    });

    if (!name || !phone || !Array.isArray(lessonIDs) || !numberOfSpaces) {
      logStep(req, 'WARNING', 'Order validation failed.');
      return res.status(400).json({ error: 'Invalid order' });
    }

    logStep(req, 'DATABASE', 'Database: after_school');
    logStep(req, 'DATABASE', 'Collection: order');
    logStep(req, 'DATABASE', 'MongoDB operation: insertOne(...)');

    const result = await db.collection('order').insertOne({
      name,
      phone,
      lessonIDs,
      numberOfSpaces,
      items,
      createdAt: new Date()
    });

    logStep(req, 'DATABASE', 'Order inserted successfully.');
    logStep(req, 'DATABASE', `Inserted order ID: ${result.insertedId}`);
    logStep(req, 'RESPONSE', 'Returning HTTP 201 Created to the Vue frontend.');

    res.status(201).json({
      message: 'Order saved',
      orderId: result.insertedId
    });
  } catch (error) {
    logStep(req, 'ERROR', 'Could not save the order.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Could not save order' });
  }
});

// Update any allowed lesson attribute using $set.
app.put('/lessons/:id', async (req, res) => {
  try {
    const allowed = ['topic', 'location', 'price', 'space', 'image'];
    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    logStep(req, 'ROUTE', 'PUT /lessons/:id');
    logStep(req, 'CODE', "server.js -> app.put('/lessons/:id', ...)");
    logStep(req, 'INFO', `Lesson ID: ${req.params.id}`);
    logStep(req, 'INFO', 'Allowed fields: topic, location, price, space, image');
    logStep(req, 'INFO', 'Actual fields being updated', update);

    if (!Object.keys(update).length) {
      logStep(req, 'WARNING', 'No valid lesson attributes were supplied.');
      return res.status(400).json({ error: 'No valid lesson attributes supplied' });
    }

    logStep(req, 'DATABASE', 'Database: after_school');
    logStep(req, 'DATABASE', 'Collection: lesson');
    logStep(req, 'DATABASE', 'MongoDB operation: findOneAndUpdate(...)');
    logStep(req, 'DATABASE', 'Update operator: $set');

    const result = await db.collection('lesson').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      logStep(req, 'WARNING', 'No lesson matched the supplied ID.');
      return res.status(404).json({ error: 'Lesson not found' });
    }

    logStep(req, 'DATABASE', 'Lesson found and updated successfully.');
    logStep(req, 'RESPONSE', 'Returning the updated lesson as JSON.');

    res.json(result);
  } catch (error) {
    logStep(req, 'ERROR', 'Invalid lesson ID or update data.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(400).json({ error: 'Invalid lesson ID or update' });
  }
});

// Challenge 1: search every required lesson attribute on the backend.
app.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    logStep(req, 'ROUTE', 'GET /search');
    logStep(req, 'CODE', "server.js -> app.get('/search', ...)");
    logStep(req, 'INFO', `Search value: "${q}"`);
    logStep(req, 'INFO', 'Search happens in Express/MongoDB, not by filtering Vue data.');

    if (!q) {
      const allLessons = await db.collection('lesson').find({}).toArray();
      logStep(req, 'DATABASE', 'Empty search: returning all lessons.');
      return res.json(allLessons);
    }

    const safeQuery = q.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');

    logStep(req, 'DATABASE', 'Database: after_school');
    logStep(req, 'DATABASE', 'Collection: lesson');
    logStep(req, 'DATABASE', 'Fields searched: topic, location, price, space');
    logStep(req, 'DATABASE', 'MongoDB operation: find({ $or: [...] })');

    const results = await db.collection('lesson').find({
      $or: [
        { topic: { $regex: safeQuery, $options: 'i' } },
        { location: { $regex: safeQuery, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$price' },
              regex: safeQuery,
              options: 'i'
            }
          }
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$space' },
              regex: safeQuery,
              options: 'i'
            }
          }
        }
      ]
    }).toArray();

    logStep(req, 'DATABASE', `Matches found: ${results.length}`);
    logStep(req, 'INFO', 'Matched lesson topics', results.map(item => item.topic));
    logStep(req, 'RESPONSE', 'Returning search results to Vue as JSON.');

    res.json(results);
  } catch (error) {
    logStep(req, 'ERROR', 'Backend search failed.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Challenge 2: return all teachers.
app.get('/teachers', async (req, res) => {
  try {
    logStep(req, 'ROUTE', 'GET /teachers');
    logStep(req, 'CODE', "server.js -> app.get('/teachers', ...)");
    logStep(req, 'DATABASE', 'Collection: teacher');
    logStep(req, 'DATABASE', 'MongoDB operation: find({})');

    const teachers = await db.collection('teacher').find({}).toArray();

    logStep(req, 'DATABASE', `Teachers found: ${teachers.length}`);
    logStep(req, 'RESPONSE', 'Returning teachers to the Vue dropdown.');

    res.json(teachers);
  } catch (error) {
    logStep(req, 'ERROR', 'Could not retrieve teachers.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Could not retrieve teachers' });
  }
});

// Challenge 2: return every lesson taught by one selected teacher.
app.get('/teachers/:id/lessons', async (req, res) => {
  try {
    logStep(req, 'ROUTE', 'GET /teachers/:id/lessons');
    logStep(req, 'CODE', "server.js -> app.get('/teachers/:id/lessons', ...)");
    logStep(req, 'INFO', `Teacher ID: ${req.params.id}`);

    logStep(req, 'DATABASE', 'Step 1: query teacher collection with findOne().');

    const teacher = await db.collection('teacher').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!teacher) {
      logStep(req, 'WARNING', 'Teacher was not found.');
      return res.status(404).json({ error: 'Teacher not found' });
    }

    logStep(req, 'DATABASE', `Teacher found: ${teacher.firstName} ${teacher.lastName}`);
    logStep(req, 'DATABASE', `Linked lesson IDs: ${teacher.lessonIDs.length}`);

    const ids = teacher.lessonIDs.map(id => new ObjectId(id));

    logStep(req, 'DATABASE', 'Step 2: query lesson collection with _id: { $in: [...] }.');

    const lessons = await db.collection('lesson').find({
      _id: { $in: ids }
    }).toArray();

    logStep(req, 'DATABASE', `Lessons returned: ${lessons.length}`);
    logStep(req, 'INFO', 'Lesson topics', lessons.map(item => item.topic));
    logStep(req, 'RESPONSE', 'Returning the selected teacher lessons to Vue.');

    res.json(lessons);
  } catch (error) {
    logStep(req, 'ERROR', 'Invalid teacher ID or teacher lesson query failed.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(400).json({ error: 'Invalid teacher ID' });
  }
});

// Challenge 3: calculate the number of purchased spaces for one lesson.
app.get('/enrolment/:lessonid', async (req, res) => {
  try {
    const lessonId = req.params.lessonid;

    logStep(req, 'ROUTE', 'GET /enrolment/:lessonid');
    logStep(req, 'CODE', "server.js -> app.get('/enrolment/:lessonid', ...)");
    logStep(req, 'INFO', `Lesson ID: ${lessonId}`);
    logStep(req, 'INFO', 'Goal: total how many slots for this lesson were purchased.');
    logStep(req, 'DATABASE', 'Collection: order');
    logStep(req, 'DATABASE', 'MongoDB operation: find({ lessonIDs: lessonId })');

    const orders = await db.collection('order').find({
      lessonIDs: lessonId
    }).toArray();

    logStep(req, 'DATABASE', `Matching orders found: ${orders.length}`);

    let enrolment = 0;

    for (const order of orders) {
      if (Array.isArray(order.items)) {
        const item = order.items.find(x => x.lessonId === lessonId);

        if (item) {
          enrolment += Number(item.quantity) || 0;
          logStep(req, 'DATABASE', `Added quantity ${item.quantity}; running total = ${enrolment}`);
        }
      } else {
        enrolment += 1;
        logStep(req, 'DATABASE', `Legacy order counted as 1; running total = ${enrolment}`);
      }
    }

    logStep(req, 'DATABASE', `Final enrolment: ${enrolment}`);
    logStep(req, 'RESPONSE', 'Returning lessonId and enrolment total as JSON.');

    res.json({ lessonId, enrolment });
  } catch (error) {
    logStep(req, 'ERROR', 'Could not calculate enrolment.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Could not calculate enrolment' });
  }
});

async function start() {
  console.log('\n============================================================');
  console.log('AFTERCLASS BACKEND STARTING');
  console.log('============================================================');
  console.log('[STARTUP] Connecting to MongoDB Atlas...');
  console.log('[STARTUP] Database: after_school');

  await client.connect();
  db = client.db(process.env.DB_NAME || 'after_school');

  console.log(`[STARTUP] MongoDB connected successfully: ${db.databaseName}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[STARTUP] Express server listening on port ${PORT}`);
    console.log('[STARTUP] Routes ready:');
    console.log('          GET  /');
    console.log('          GET  /lessons');
    console.log('          POST /orders');
    console.log('          PUT  /lessons/:id');
    console.log('          GET  /search?q=');
    console.log('          GET  /teachers');
    console.log('          GET  /teachers/:id/lessons');
    console.log('          GET  /enrolment/:lessonid');
    console.log('          GET  /images/:filename');
    console.log('============================================================\n');
  });
}

start().catch(error => {
  console.error('[STARTUP] Backend failed to start.');
  console.error('[STARTUP] Technical error:', error.message);
  process.exit(1);
});