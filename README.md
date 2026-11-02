# CST3144 Express Back End

Node.js + Express REST API for the CST3144 after-school lessons application.

## Required stack
- Node.js
- Express.js
- Native MongoDB Node.js driver
- MongoDB Atlas
- Render

## Local setup
1. Copy `.env.example` to `.env`.
2. Add your MongoDB Atlas connection string.
3. Run `npm install`.
4. Run `npm start`.
5. Test `http://localhost:3000/health` and `/lessons`.

The existing Atlas database already contains lessons, teachers and orders.
`npm run seed` deletes orders and resets lessons and teachers. Run it only for an explicitly requested reset.

## Core routes
- `GET /lessons`
- `POST /orders`
- `PUT /lessons/:id`

## Challenge routes
- `GET /search?q=`
- `GET /teachers`
- `GET /teachers/:id/lessons`
- `GET /enrolment/:lessonid`

## Static images
- `GET /images/:filename`
- Missing images return HTTP 404 JSON.

## Render deployment
Use the existing **M01016510-after-school** service connected to `Lvish10/CST3144-Backend`, branch `main`.
Do not create a second service.

- Build command: `npm install`
- Start command: `npm start`

Add these environment variables in Render:
- `MONGODB_URI`
- `DB_NAME=after_school`
- `FRONTEND_ORIGIN=https://lvish10.github.io`

Do not commit `.env` or `node_modules`.

After deployment, verify:
`https://m01016510-after-school.onrender.com/lessons`

`GET /health` also reports the deployed commit, branch and repository supplied by Render.

## Other routes

- `GET /` — live activity dashboard
- `GET /log-stream` — Server-Sent Events stream
- `POST /client-events` — safe UI activity summaries
- `GET /my-enrolments?phone=` — enrolments read from Atlas
- `DELETE /enrolments/:orderId/:lessonId` — de-enrol one purchased space

## Exports

Run `npm run export` for an actual Atlas snapshot, without resetting data.
`EXPORT_DIR=../supporting-files/database` writes outside both repositories in the shared workspace.
Without that setting, the destination is the ignored `database-exports/` folder.
Exports use Extended JSON to preserve ObjectIds, dates and number types.

## Learning and debugging

Open `.vscode/launch.json` with **Run and Debug → Run AfterClass Backend**.
Read `docs/API-GUIDE.md`, `docs/RENDER-GUIDE.md` and `docs/BACKEND-LOGGING-GUIDE.md`.
The Postman collection and Local/Render environments are in `postman/`.

This is a learning project. Phone lookup is not authentication. Separate order and lesson requests are not an atomic reservation system.
