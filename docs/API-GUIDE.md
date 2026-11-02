# API guide

Local: http://localhost:3000. Hosted: https://m01016510-after-school.onrender.com.

## GET /health

- Input: No input
- Process: Reports service, database and Render commit/branch/repository metadata.
- Database action: No collection query
- Output: JSON 200
- Frontend caller: Manual health check
- Postman / logs: Health check / CODE + ROUTE

## GET /

- Input: No input
- Process: Serves the backend activity page.
- Database action: None
- Output: HTML 200
- Frontend caller: Browser dashboard
- Postman / logs: Dashboard / ROUTE

## GET /log-stream

- Input: SSE connection
- Process: Sends buffered logs then future messages; removes disconnected clients.
- Database action: None; memory buffer
- Output: text/event-stream
- Frontend caller: Dashboard EventSource
- Postman / logs: Live Logging / request stays open

## POST /client-events

- Input: {event, action, target, details}
- Process: Publishes safe, meaningful interaction summaries; excludes unknown detail keys.
- Database action: None
- Output: 204 empty
- Frontend caller: sendClientEvent
- Postman / logs: POST Client Event / CLIENT

## GET /lessons

- Input: No input
- Process: Reads every lesson.
- Database action: lesson.find({}).toArray()
- Output: JSON array 200
- Frontend caller: loadLessons and checkout stock check
- Postman / logs: GET All Lessons / DATABASE + RESPONSE

## POST /orders

- Input: Validated name, phone, lessonIDs, numberOfSpaces, items
- Process: Checks ID/quantity consistency and availability, then saves order.
- Database action: lesson.find($in); order.insertOne(...)
- Output: 201 with orderId; invalid 400/unavailable 409
- Frontend caller: checkout
- Postman / logs: POST New Order / masked summary + insert ID

## PUT /lessons/:id

- Input: ObjectId parameter; allowed fields in JSON body
- Process: Validates values and sets supplied attributes.
- Database action: lesson.findOneAndUpdate({_id},{$set:update})
- Output: Updated lesson 200; 400/404
- Frontend caller: checkout
- Postman / logs: PUT Lesson Space / PUT Lesson Price

## GET /search?q=

- Input: Free search text
- Process: Escapes regex input; checks topic/location/price/space with $or.
- Database action: lesson.find({$or:[...]})
- Output: Matching array 200
- Frontend caller: searchLessons
- Postman / logs: Search Lessons / match count

## GET /teachers

- Input: No input
- Process: Reads teacher documents.
- Database action: teacher.find({})
- Output: JSON array 200
- Frontend caller: loadTeachers
- Postman / logs: GET Teachers / teacher count

## GET /teachers/:id/lessons

- Input: Teacher ObjectId
- Process: Reads teacher links and all matching lessons.
- Database action: teacher.findOne({_id}); lesson.find({_id:{$in:ids}})
- Output: Lesson array 200; 400/404
- Frontend caller: loadTeacherLessons
- Postman / logs: GET Teacher Lessons / linked lesson count

## GET /enrolment/:lessonid

- Input: Lesson ID string
- Process: Adds purchased item quantities for matching orders.
- Database action: order.find({lessonIDs:lessonId})
- Output: {lessonId,enrolment} 200
- Frontend caller: loadEnrolment
- Postman / logs: GET Enrolment / running total

## GET /my-enrolments?phone=

- Input: Digits-only checkout phone
- Process: Reads that phone’s orders and joins positive-quantity items to lessons.
- Database action: order.find({phone}).sort(...); lesson.findOne(...)
- Output: {phone,enrolments} 200; 400/500
- Frontend caller: loadMyEnrolments
- Postman / logs: GET My Enrolments / masked phone and counts

## DELETE /enrolments/:orderId/:lessonId

- Input: Order and lesson IDs
- Process: Decreases one purchased quantity and increments available stock.
- Database action: order.findOne/updateOne; lesson.findOne/findOneAndUpdate($inc)
- Output: Updated lesson 200; 400/404/409
- Frontend caller: deEnrol
- Postman / logs: DELETE One Enrolment / updated order and restored stock

## GET /images/:filename

- Input: Image filename
- Process: Serves an existing file from public/images; clear fallback for missing files.
- Database action: No MongoDB action
- Output: Image 200 or JSON 404
- Frontend caller: imageUrl via browser <img>
- Postman / logs: GET Valid Image / GET Missing Image

Separate checkout/de-enrol writes are not transactions. Phone lookup is not authentication.
