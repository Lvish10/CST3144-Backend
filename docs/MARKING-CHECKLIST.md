# Backend Marking Checklist

## Core backend
- [x] Node.js server
- [x] Express.js REST API
- [x] Native MongoDB Node.js driver
- [x] MongoDB Atlas database
- [x] lesson collection with topic, location, price and space
- [x] order collection with name, phone, lesson IDs and number of spaces
- [x] logger middleware outputs every request
- [x] static image middleware
- [x] missing image returns a 404 error message
- [x] GET /lessons
- [x] POST /orders
- [x] PUT /lessons/:id can set any allowed lesson attribute

## Challenges
- [x] GET /search?q= searches topic, location, price and space in MongoDB
- [x] teacher collection with firstName, lastName and lessonIDs
- [x] GET /teachers
- [x] GET /teachers/:id/lessons
- [x] GET /enrolment/:lessonid calculates purchased slots from orders

## Hosting/demo
- [x] Render service name includes student number: M01016510-after-school
- [x] Render connects to MongoDB Atlas
- [x] detailed live logs are visible in Render
- [x] backend repository has more than 10 commits
