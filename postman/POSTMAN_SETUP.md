# Postman Setup — CST3144 AfterClass

The Postman files in this folder are already prepared for both local and hosted testing.

## Files

- `CST3144_AfterClass.postman_collection.json`
- `CST3144_AfterClass_Local.postman_environment.json`
- `CST3144_AfterClass_Render.postman_environment.json`

## Import

In Postman:

1. Click **Import**.
2. Import the collection JSON.
3. Import both environment JSON files.
4. Select **CST3144 AfterClass - Render** for the hosted demo.
5. Select **CST3144 AfterClass - Local** only while `npm start` is running in VS Code.

## Collection layout

The collection is grouped into:

1. **Core REST Requirements**
   - GET All Lessons
   - POST New Order
   - PUT Lesson Space
   - PUT Lesson Price

2. **Challenge Tasks**
   - Search Lessons
   - GET Teachers
   - GET Teacher Lessons
   - GET Enrolment

3. **Middleware and Images**
   - GET Valid Image
   - GET Missing Image

4. **Atlas Enrolment Features**
   - GET My Enrolments
   - DELETE One Enrolment

5. **Live Logging**
   - POST Client Event

## Important automation

**POST New Order automatically saves the returned order ID into the active Postman environment.**

That means you can:

1. Run **POST New Order**.
2. Postman stores `orderId`.
3. Run **DELETE One Enrolment** without manually copying the ID.

The collection also contains simple Postman tests for response status and expected data.

## Core coursework demo sequence

Use the Render environment and run:

1. **GET All Lessons**
2. **POST New Order**
3. **PUT Lesson Space**
4. **PUT Lesson Price**

These prove the required GET, POST and flexible PUT REST operations.

## Challenge demo sequence

Run:

1. **Search Lessons**
2. **GET Teachers**
3. **GET Teacher Lessons**
4. **GET Enrolment**

## Middleware demo

Run:

1. **GET Valid Image** → should return HTTP 200.
2. **GET Missing Image** → should return HTTP 404.

## Atlas-backed enrolments

The collection uses phone number `59001234` in the prepared example requests.

**POST New Order** creates an order with that phone number.

Then run **GET My Enrolments** to read that order back from MongoDB Atlas.

## Live backend logging

Open:

`https://m01016510-after-school.onrender.com`

Leave it open while sending Postman requests.

The page shows live sanitized activity, including:

- incoming request
- HTTP method and URL
- Express route
- backend code section
- MongoDB collection
- MongoDB operation
- result summary
- response status
- duration
- client-event logs

You can also run **POST Client Event** to demonstrate frontend/client event logging explicitly.

## Data warning

POST, PUT and DELETE requests modify the real MongoDB Atlas database.

The seed script defines this initial state:

- 10 lessons
- 5 spaces each
- 4 teachers
- 0 orders

Do not run `npm run seed` unless you intentionally want to erase orders and reset spaces.

These are initial values, not a claim about the current live database. Purchases change the space and order counts.
The demonstration PUT sets space to 4 and price to 105. Record the original values first;
after the demonstration, de-enrol only your own test purchase and restore the original price with PUT.
Do not remove someone else's enrolment or use seeding for cleanup.

The local audit runner in the shared workspace (`supporting-files/tools/verify-api.cjs`)
uses a unique synthetic phone, executes these request assertions, restores its test changes,
and retains the resulting zero-quantity order document. This is distinct from importing the collection into the Postman desktop app.

## Submission export

For the final coursework package, export the Postman collection from Postman as Collection v2.1 JSON and include it with the required submission files.
