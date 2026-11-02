require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;
let requestNumber = 0;

// Small in-memory buffer for the public live log page.
// It stores only sanitized teaching/debug messages, never secrets.
const liveLogBuffer = [];
const liveLogClients = new Set();
const MAX_LIVE_LOGS = 250;

function publishLiveLog(message) {
  const entry = {
    time: new Date().toISOString(),
    message: String(message)
  };

  liveLogBuffer.push(entry);

  if (liveLogBuffer.length > MAX_LIVE_LOGS) {
    liveLogBuffer.shift();
  }

  const payload = `data: ${JSON.stringify(entry)}\n\n`;

  for (const client of liveLogClients) {
    client.write(payload);
  }
}

function consoleAndLive(message) {
  console.log(message);
  publishLiveLog(message);
}


// Small helper so every request can be followed from start to finish.
function nextRequestId() {
  requestNumber += 1;
  return `REQ-${String(requestNumber).padStart(4, '0')}`;
}

function logStep(req, label, message, details = null) {
  const id = req.requestId || 'STARTUP';
  consoleAndLive(`[${id}] [${label}] ${message}`);

  if (details) {
    const safeDetails = typeof details === 'string'
      ? details
      : JSON.stringify(details);
    consoleAndLive(`[${id}]            ${safeDetails}`);
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
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Detailed logger middleware for every request.
app.use((req, res, next) => {
  req.requestId = nextRequestId();
  req.startedAt = Date.now();

  consoleAndLive('------------------------------------------------------------');
  logStep(req, 'REQUEST', 'Request started');
  logStep(req, 'INFO', `Method: ${req.method}`);
  logStep(req, 'INFO', `URL: ${req.originalUrl}`);
  logStep(req, 'INFO', 'The browser/frontend has sent a request to Express.');

  res.on('finish', () => {
    const duration = Date.now() - req.startedAt;
    logStep(req, 'RESPONSE', `HTTP status: ${res.statusCode}`);
    logStep(req, 'SUCCESS', `Request completed in ${duration} ms`);
    consoleAndLive('------------------------------------------------------------');
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

app.get('/health', (req, res) => {
  logStep(req, 'ROUTE', 'GET /health');
  logStep(req, 'INFO', 'Health check confirms the AfterClass API is running.');
  res.json({
    status: 'ok',
    service: 'AfterClass API',
    database: db ? db.databaseName : 'connecting'
  });
});

// Browser-readable live backend log stream.
app.get('/log-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  for (const entry of liveLogBuffer) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  liveLogClients.add(res);

  req.on('close', () => {
    liveLogClients.delete(res);
  });
});

// Public teaching/debug dashboard. No secrets are displayed here.
app.get('/', (req, res) => {
  logStep(req, 'ROUTE', 'GET /');
  logStep(req, 'INFO', 'Opening the live backend activity dashboard.');

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AfterClass Backend Activity</title>
  <style>
    :root{font-family:Arial,sans-serif;color:#e5eef8;background:#09111f}
    *{box-sizing:border-box}body{margin:0;background:#09111f}
    header{padding:22px 28px;background:#10243e;border-bottom:1px solid #294563}
    h1{margin:0 0 6px;font-size:1.55rem}p{margin:0;color:#b8c7d9}
    main{max-width:1200px;margin:auto;padding:22px}
    .grid{display:grid;grid-template-columns:280px 1fr;gap:18px}
    .panel{background:#101b2b;border:1px solid #24364d;border-radius:12px;padding:16px}
    .panel h2{margin:0 0 12px;font-size:1rem}
    .route{padding:7px 0;border-bottom:1px solid #203046;font-family:Consolas,monospace;font-size:.86rem}
    .method{display:inline-block;width:58px;color:#7dd3fc;font-weight:700}
    #logs{height:68vh;overflow:auto;background:#050a12;border-radius:9px;padding:14px;font-family:Consolas,monospace;font-size:.86rem;line-height:1.55;white-space:pre-wrap}
    .line{padding:2px 0}.time{color:#64748b;margin-right:8px}.db{color:#86efac}.err{color:#fca5a5}.req{color:#93c5fd}.success{color:#67e8f9}.client{color:#fbbf24}
    .toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}
    .status{display:flex;gap:7px;align-items:center;color:#a7f3d0}.dot{width:9px;height:9px;background:#22c55e;border-radius:50%}
    button{border:0;border-radius:7px;padding:7px 10px;background:#24364d;color:#fff;cursor:pointer}
    small{color:#94a3b8}
    @media(max-width:800px){.grid{grid-template-columns:1fr}#logs{height:55vh}}
  </style>
</head>
<body>
<header>
  <h1>AfterClass — Live Backend Activity</h1>
  <p>Express → MongoDB Atlas activity, explained live. Sensitive values are not displayed.</p>
</header>
<main>
  <div class="grid">
    <aside class="panel">
      <h2>Available API routes</h2>
      <div class="route"><span class="method">GET</span>/health</div>
      <div class="route"><span class="method">GET</span>/lessons</div>
      <div class="route"><span class="method">POST</span>/orders</div>\n      <div class="route"><span class="method">POST</span>/client-events</div>
      <div class="route"><span class="method">PUT</span>/lessons/:id</div>
      <div class="route"><span class="method">GET</span>/search?q=</div>
      <div class="route"><span class="method">GET</span>/teachers</div>
      <div class="route"><span class="method">GET</span>/teachers/:id/lessons</div>
      <div class="route"><span class="method">GET</span>/enrolment/:lessonid</div>
      <div class="route"><span class="method">GET</span>/my-enrolments?phone=</div>
      <div class="route"><span class="method">DELETE</span>/enrolments/:orderId/:lessonId</div>
      <div class="route"><span class="method">GET</span>/images/:filename</div>
      <br>
      <small>Open the GitHub Pages frontend in another tab. Every backend request appears here as it happens.</small>
    </aside>
    <section class="panel">
      <div class="toolbar">
        <div class="status"><span class="dot"></span><strong>Live</strong></div>
        <button id="clear">Clear screen</button>
      </div>
      <div id="logs"></div>
    </section>
  </div>
</main>
<script>
  const logs = document.getElementById('logs');
  const source = new EventSource('/log-stream');

  function add(entry) {
    const row = document.createElement('div');
    row.className = 'line';

    if (entry.message.includes('[DATABASE]')) row.classList.add('db');
    if (entry.message.includes('[CLIENT]')) row.classList.add('client');
    if (entry.message.includes('[ERROR]')) row.classList.add('err');
    if (entry.message.includes('[REQUEST]') || entry.message.includes('[ROUTE]')) row.classList.add('req');
    if (entry.message.includes('[SUCCESS]') || entry.message.includes('[RESPONSE]')) row.classList.add('success');

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = new Date(entry.time).toLocaleTimeString();

    row.appendChild(time);
    row.appendChild(document.createTextNode(entry.message));
    logs.appendChild(row);
    logs.scrollTop = logs.scrollHeight;
  }

  source.onmessage = event => add(JSON.parse(event.data));

  source.onerror = () => {
    const row = document.createElement('div');
    row.className = 'line err';
    row.textContent = 'Live stream disconnected. The browser will retry automatically.';
    logs.appendChild(row);
  };

  document.getElementById('clear').onclick = () => {
    logs.innerHTML = '';
  };
</script>
</body>
</html>`);
});

// Receive safe frontend interaction events so the live log can show the full user flow.
app.post('/client-events', (req, res) => {
  const { event, action, target, details = {} } = req.body || {};

  logStep(req, 'CLIENT', 'Frontend interaction received.');
  logStep(req, 'CLIENT', `Event: ${event || 'unknown'}`);
  logStep(req, 'CLIENT', `Action: ${action || 'unknown'}`);
  logStep(req, 'CLIENT', `Target: ${target || 'unknown'}`);

  // Keep only simple non-sensitive details.
  const safeDetails = {};

  for (const [key, value] of Object.entries(details || {})) {
    if (['phone', 'name', 'password', 'token', 'mongodb_uri'].includes(String(key).toLowerCase())) {
      continue;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safeDetails[key] = value;
    }
  }

  if (Object.keys(safeDetails).length) {
    logStep(req, 'CLIENT', 'Details', safeDetails);
  }

  res.status(204).end();
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

// Return enrolments stored in MongoDB for one customer phone number.
app.get('/my-enrolments', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();

    logStep(req, 'ROUTE', 'GET /my-enrolments?phone=');
    logStep(req, 'CODE', "server.js -> app.get('/my-enrolments', ...)");
    logStep(req, 'INFO', `Phone lookup: ${maskPhone(phone)}`);
    logStep(req, 'INFO', 'Goal: rebuild the customer enrolment list from MongoDB Atlas.');

    if (!/^\d+$/.test(phone)) {
      logStep(req, 'WARNING', 'Phone lookup is missing or invalid.');
      return res.status(400).json({ error: 'Enter a valid phone number' });
    }

    logStep(req, 'DATABASE', 'Step 1: query the order collection by phone.');
    logStep(req, 'DATABASE', 'MongoDB operation: find({ phone })');

    const orders = await db.collection('order')
      .find({ phone })
      .sort({ createdAt: -1 })
      .toArray();

    logStep(req, 'DATABASE', `Orders found: ${orders.length}`);

    const enrolments = [];

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        const quantity = Number(item.quantity) || 0;

        if (quantity <= 0) continue;

        const lesson = await db.collection('lesson').findOne({
          _id: new ObjectId(item.lessonId)
        });

        if (!lesson) continue;

        enrolments.push({
          orderId: order._id,
          lessonId: lesson._id,
          topic: lesson.topic,
          location: lesson.location,
          price: lesson.price,
          image: lesson.image,
          availableSpace: lesson.space,
          quantity,
          purchasedAt: order.createdAt || null
        });
      }
    }

    logStep(req, 'DATABASE', `Active enrolment entries returned: ${enrolments.length}`);
    logStep(req, 'RESPONSE', 'Returning MongoDB-backed enrolments to Vue.');

    res.json({
      phone,
      enrolments
    });
  } catch (error) {
    logStep(req, 'ERROR', 'Could not load customer enrolments.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(500).json({ error: 'Could not load enrolments' });
  }
});

// Extra enrolment action: remove one purchased slot and restore one lesson space.
app.delete('/enrolments/:orderId/:lessonId', async (req, res) => {
  try {
    const { orderId, lessonId } = req.params;

    logStep(req, 'ROUTE', 'DELETE /enrolments/:orderId/:lessonId');
    logStep(req, 'CODE', "server.js -> app.delete('/enrolments/:orderId/:lessonId', ...)");
    logStep(req, 'INFO', 'Goal: remove one purchased slot from an existing order.');
    logStep(req, 'INFO', `Order ID: ${orderId}`);
    logStep(req, 'INFO', `Lesson ID: ${lessonId}`);

    const order = await db.collection('order').findOne({
      _id: new ObjectId(orderId)
    });

    if (!order) {
      logStep(req, 'WARNING', 'Order was not found.');
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemIndex = items.findIndex(item => item.lessonId === lessonId);

    if (itemIndex === -1) {
      logStep(req, 'WARNING', 'The selected lesson was not found in this order.');
      return res.status(404).json({ error: 'Lesson not found in order' });
    }

    const currentQuantity = Number(items[itemIndex].quantity) || 0;

    if (currentQuantity <= 0) {
      return res.status(400).json({ error: 'No purchased space to remove' });
    }

    const newItems = items.map(item => ({ ...item }));

    if (currentQuantity === 1) {
      newItems.splice(itemIndex, 1);
    } else {
      newItems[itemIndex].quantity = currentQuantity - 1;
    }

    const newLessonIDs = currentQuantity === 1
      ? order.lessonIDs.filter(id => id !== lessonId)
      : order.lessonIDs;

    const newNumberOfSpaces = Math.max(
      0,
      Number(order.numberOfSpaces || 0) - 1
    );

    logStep(req, 'DATABASE', 'Updating order collection after de-enrolment.');

    await db.collection('order').updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          items: newItems,
          lessonIDs: newLessonIDs,
          numberOfSpaces: newNumberOfSpaces
        }
      }
    );

    const lesson = await db.collection('lesson').findOne({
      _id: new ObjectId(lessonId)
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const restoredSpace = Math.min(5, Number(lesson.space || 0) + 1);

    logStep(req, 'DATABASE', 'Restoring one available lesson space.');
    logStep(req, 'DATABASE', `Lesson space: ${lesson.space} -> ${restoredSpace}`);

    const updatedLesson = await db.collection('lesson').findOneAndUpdate(
      { _id: new ObjectId(lessonId) },
      { $set: { space: restoredSpace } },
      { returnDocument: 'after' }
    );

    logStep(req, 'RESPONSE', 'One enrolment removed and one lesson space restored.');

    res.json({
      message: 'De-enrolled successfully',
      lesson: updatedLesson,
      remainingPurchasedSpacesInOrder: currentQuantity - 1
    });
  } catch (error) {
    logStep(req, 'ERROR', 'Could not de-enrol from the lesson.');
    console.error(`[${req.requestId}] Technical error:`, error.message);
    res.status(400).json({ error: 'Could not de-enrol from lesson' });
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
  consoleAndLive('============================================================');
  consoleAndLive('AFTERCLASS BACKEND STARTING');
  consoleAndLive('============================================================');
  consoleAndLive('[STARTUP] Connecting to MongoDB Atlas...');
  consoleAndLive('[STARTUP] Database: after_school');

  await client.connect();
  db = client.db(process.env.DB_NAME || 'after_school');

  consoleAndLive(`[STARTUP] MongoDB connected successfully: ${db.databaseName}`);

  app.listen(PORT, '0.0.0.0', () => {
    consoleAndLive(`[STARTUP] Express server listening on port ${PORT}`);
    consoleAndLive('[STARTUP] Routes ready:');
    consoleAndLive('          GET  /');
    consoleAndLive('          GET  /health');
    consoleAndLive('          GET  /lessons');
    consoleAndLive('          POST /orders');
    consoleAndLive('          POST /client-events');
    consoleAndLive('          PUT  /lessons/:id');
    consoleAndLive('          GET  /search?q=');
    consoleAndLive('          GET  /teachers');
    consoleAndLive('          GET  /teachers/:id/lessons');
    consoleAndLive('          GET  /enrolment/:lessonid');
    consoleAndLive('          GET  /my-enrolments?phone=');
    consoleAndLive('          DELETE /enrolments/:orderId/:lessonId');
    consoleAndLive('          GET  /images/:filename');
    consoleAndLive('============================================================');
  });
}

start().catch(error => {
  console.error('[STARTUP] Backend failed to start.');
  console.error('[STARTUP] Technical error:', error.message);
  process.exit(1);
});