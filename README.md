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
4. Run `npm run seed` once.
5. Run `npm start`.
6. Test `http://localhost:3000/lessons`.

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
Create a Node Web Service from this repository.

- Build command: `npm install`
- Start command: `npm start`

Add these environment variables in Render:
- `MONGODB_URI`
- `DB_NAME=after_school`
- `FRONTEND_ORIGIN=https://lvish10.github.io`

Do not commit `.env` or `node_modules`.

After deployment, verify:
`https://YOUR-STUDENT-NUMBER-after-school.onrender.com/lessons`
