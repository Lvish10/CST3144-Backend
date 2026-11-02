# Postman Setup - CST3144 AfterClass

## 1. Install Postman
Download the Postman desktop app from the official Postman website and sign in or create a free account.

## 2. Import the files
In Postman:
1. Click **Import**.
2. Import `CST3144_AfterClass.postman_collection.json`.
3. Import `CST3144_AfterClass_Local.postman_environment.json`.
4. Import `CST3144_AfterClass_Render.postman_environment.json`.

## 3. Choose an environment
Use **CST3144 AfterClass - Local** when your VS Code backend is running with `npm start`.

Use **CST3144 AfterClass - Render** when demonstrating the hosted backend.

## 4. Core requests for the coursework demo
Prepare these first:
- **01 - GET All Lessons** -> proves `GET /lessons`.
- **06 - POST New Order** -> proves the order collection can receive an order.
- **07 - PUT Lesson Space** -> proves a lesson field can be updated to a specific value.
- **08 - PUT Lesson Price** -> additionally proves PUT is not limited to increment/decrement.

## 5. Challenge requests
- **02 - Search Lessons** -> backend search.
- **03 - GET Teachers** -> teacher collection.
- **04 - GET Teacher Lessons** -> lessons associated with one teacher.
- **05 - GET Enrolment** -> purchased slots for one lesson.

## 6. MongoDB-backed My Enrolments
Run **GET My Enrolments** with the same phone number used when creating an order.

This proves the enrolment page is loaded from MongoDB Atlas rather than browser storage.

The response contains active purchased lessons, order IDs, lesson details and quantities.

## 7. Middleware requests
- **09 - GET Valid Image** -> static middleware returns a real image.
- **10 - GET Missing Image** -> static middleware returns HTTP 404 and JSON error.

## 8. Optional de-enrol request
First run **06 - POST New Order**.

The response contains:
```json
{
  "message": "Order saved",
  "orderId": "..."
}
```

Copy that `orderId` into the active Postman environment variable called `orderId`.

Then run **11 - DELETE One Enrolment**.

This removes one purchased slot and restores one lesson space.

## 9. Important testing note
The PUT requests change real Atlas data. If you change Mathematics to space 4 or price 105 during testing, either change it back afterward or run `npm run seed` only when you intentionally want to reset the database.

## 10. What to have open for the demonstration
- GitHub Pages frontend
- Render logs
- MongoDB Atlas / Compass collection view
- VS Code frontend and backend code
- Postman with this collection and the **Render** environment selected

The logger in Render should print the route, MongoDB collection/operation, response status and duration as you send each Postman request.
