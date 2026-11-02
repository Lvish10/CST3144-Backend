require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, BSON } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function exportCollections() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'after_school');
  const outputDir = path.resolve(__dirname, process.env.EXPORT_DIR || 'database-exports');

  fs.mkdirSync(outputDir, { recursive: true });

  for (const collectionName of ['lesson', 'order', 'teacher']) {
    const rows = await db.collection(collectionName).find({}).toArray();
    const file = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(file, BSON.EJSON.stringify(rows, null, 2, { relaxed: false }));
    console.log(`Exported ${rows.length} document(s) -> ${file}`);
  }

  await client.close();
}

exportCollections().catch(err => {
  console.error(err);
  process.exit(1);
});
