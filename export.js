require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function exportCollections() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'after_school');
  const outputDir = path.join(__dirname, 'database-exports');

  fs.mkdirSync(outputDir, { recursive: true });

  for (const collectionName of ['lesson', 'order', 'teacher']) {
    const rows = await db.collection(collectionName).find({}).toArray();
    const file = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2));
    console.log(`Exported ${rows.length} document(s) -> ${file}`);
  }

  await client.close();
}

exportCollections().catch(err => {
  console.error(err);
  process.exit(1);
});
