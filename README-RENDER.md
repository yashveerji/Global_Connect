# Deploying Global-Connect-platform on Render

This app is split into backend (Express + Socket.IO) and frontend (Vite + React).

## Backend (Render Web Service)
- Root: `backend`
- Build command: (none)
- Start command: `node index.js`
- Environment
  - `PORT` is provided by Render
  - `NODE_ENV=production`
  - `CORS_ORIGINS=https://<your-frontend-host>` (comma-separate multiple)
  - `TWILIO_ACCOUNT_SID=<sid>`
  - `TWILIO_AUTH_TOKEN=<token>`
- Health check: `GET /api/health` (also `/` works)
- WebSockets: enable in service settings

## Frontend (Render Static Site)
- Root: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Environment variables (during build)
  - `VITE_SERVER_URL=https://<your-backend-host>`
  - Optional for strict networks: 
    - `VITE_FORCE_TURN=true`
    - `VITE_TURN_TCP_ONLY=true`
  - Optional fallback if dynamic ICE isn’t available: 
    - `VITE_TURN_URL=turns:global.turn.twilio.com:5349?transport=tcp,turn:global.turn.twilio.com:3478?transport=tcp`
    - `VITE_TURN_USERNAME=<twilio-username>`
    - `VITE_TURN_CREDENTIAL=<twilio-credential>`

## Notes
- Socket.IO is configured for transports [websocket, polling] and proxy-friendly timeouts.
- Backend trusts proxy (cookies, proto) with `app.set('trust proxy', 1)`.
- CSP is strict by default; test pages under `public/` have scoped relaxations.
- SPA routing is handled by `frontend/public/_redirects`.