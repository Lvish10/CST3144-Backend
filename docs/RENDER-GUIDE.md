# Existing Render deployment

Service: M01016510-after-school

URL: https://m01016510-after-school.onrender.com

Repository: Lvish10/CST3144-Backend, branch main. Build: npm install. Start: npm start. A main-branch push can trigger automatic deployment; verify the health commit rather than assuming it succeeded.

Environment: private MONGODB_URI, DB_NAME=after_school, FRONTEND_ORIGIN=https://lvish10.github.io. PORT is supplied by Render. The origin excludes /CST3144/ because paths are not part of an origin.

Use the existing service Settings/Environment/Logs. Do not create another service and do not seed during deployment. / is the custom activity dashboard, /log-stream is its SSE feed; these differ from deployment/runtime logs. /health reports Render commit/branch/repository metadata for source verification.
