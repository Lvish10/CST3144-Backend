require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

const lessonIds = [
  '66f000000000000000000001',
  '66f000000000000000000002',
  '66f000000000000000000003',
  '66f000000000000000000004',
  '66f000000000000000000005',
  '66f000000000000000000006',
  '66f000000000000000000007',
  '66f000000000000000000008',
  '66f000000000000000000009',
  '66f00000000000000000000a'
];

const teacherIds = [
  '77f000000000000000000001',
  '77f000000000000000000002',
  '77f000000000000000000003',
  '77f000000000000000000004'
];

const lessonData = [
  ['Mathematics','Hendon',100,'math.svg'],
  ['Science','Colindale',90,'science.svg'],
  ['Coding','Brent Cross',110,'coding.svg'],
  ['English','Golders Green',80,'english.svg'],
  ['Art','Wembley',70,'art.svg'],
  ['Music','Harrow',85,'music.svg'],
  ['Robotics','Finchley',120,'robotics.svg'],
  ['French','Edgware',75,'french.svg'],
  ['Drama','Camden',95,'drama.svg'],
  ['Chess','Barnet',65,'chess.svg']
];

const lessons = lessonData.map(([topic, location, price, image], index) => ({
  _id: new ObjectId(lessonIds[index]),
  topic,
  location,
  price,
  space: 5,
  image
}));

async function seed() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'after_school');

  await db.collection('lesson').deleteMany({});
  await db.collection('order').deleteMany({});
  await db.collection('teacher').deleteMany({});

  await db.collection('lesson').insertMany(lessons);

  await db.collection('teacher').insertMany([
    { _id: new ObjectId(teacherIds[0]), firstName: 'Aisha', lastName: 'Patel', lessonIDs: [lessonIds[0], lessonIds[1], lessonIds[6]] },
    { _id: new ObjectId(teacherIds[1]), firstName: 'Daniel', lastName: 'Brown', lessonIDs: [lessonIds[2], lessonIds[9]] },
    { _id: new ObjectId(teacherIds[2]), firstName: 'Sofia', lastName: 'Martin', lessonIDs: [lessonIds[3], lessonIds[7], lessonIds[8]] },
    { _id: new ObjectId(teacherIds[3]), firstName: 'Maya', lastName: 'Chen', lessonIDs: [lessonIds[4], lessonIds[5]] }
  ]);

  console.log('Database seeded: 10 lessons, 4 teachers, 0 orders');
  console.log('Mathematics lesson ID:', lessonIds[0]);
  console.log('Aisha Patel teacher ID:', teacherIds[0]);

  await client.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
