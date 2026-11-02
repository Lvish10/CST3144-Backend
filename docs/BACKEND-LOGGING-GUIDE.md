# Backend Logging Guide

The logger is intentionally simple and uses only built-in JavaScript and Express features.

## What happens for each request

1. Express assigns a request ID such as `REQ-0001`.
2. The logger records the HTTP method and URL.
3. The selected route prints what it is doing.
4. Database routes print the MongoDB collection and operation.
5. The result is summarised safely.
6. When the response finishes, the logger prints the HTTP status and duration.

## Example

```
[REQ-0001] [REQUEST] Request started
[REQ-0001] [INFO] Method: GET
[REQ-0001] [INFO] URL: /lessons
[REQ-0001] [ROUTE] GET /lessons
[REQ-0001] [DATABASE] Collection: lesson
[REQ-0001] [DATABASE] MongoDB operation: find({})
[REQ-0001] [DATABASE] Documents found: 10
[REQ-0001] [RESPONSE] HTTP status: 200
[REQ-0001] [SUCCESS] Request completed in 31 ms
```

## Labels

- `REQUEST`: a request entered Express.
- `ROUTE`: which REST route handles it.
- `CODE`: the related server.js section.
- `INFO`: simple explanation of what is happening.
- `DATABASE`: MongoDB database work.
- `RESPONSE`: what is returned to the browser/frontend.
- `SUCCESS`: completed operation.
- `WARNING`: expected problem such as a missing record.
- `ERROR`: operation failed.

## Security

The logger never prints:
- MONGODB_URI
- database passwords
- .env contents
- GitHub or Render tokens

Order names and phone numbers are masked before being logged.

## Demo routes to show

- GET /lessons
- POST /orders
- PUT /lessons/:id
- GET /search?q=math
- GET /teachers
- GET /teachers/:id/lessons
- GET /enrolment/:lessonid
- GET /images/math.svg
- GET /images/missing.svg

Follow one request ID from REQUEST through DATABASE to RESPONSE to explain the full backend flow.
