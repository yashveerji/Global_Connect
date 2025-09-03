# Global Connect

A modern, full‑stack social network platform (LinkedIn‑style) with realtime chat, rich post creation, notifications, and voice/video calling. Built with React (Vite) and Node.js/Express on MongoDB, featuring Cloudinary media, Socket.IO presence, and WebRTC signaling.

## Highlights
- Auth & Security
  - Email OTP verification, secure login with HttpOnly JWT cookie
  - CORS with credentials and proxy‑aware cookies (SameSite/secure)
- Posts & Feed
  - Create posts with optional image upload to Cloudinary (client compression)
  - Likes/reactions, comments, save/unsave, delete with undo toast
  - Repost and Quote‑Repost, infinite scroll feed, skeleton loaders
  - Rich text autolinking for URLs, @mentions, and #hashtags
- Notifications
  - In‑app notifications for likes/comments with read/mark‑all‑read
- Realtime Chat
  - Socket.IO messaging, delivery/read receipts, typing indicators, presence
  - File/image attachments (Cloudinary) and inbox/history APIs
- Calls (WebRTC)
  - Voice/video signaling over Socket.IO, ICE prefs, ring/answer/reject/end flow
  - Call logs persisted with basic statuses (ringing/answered/rejected/ended)
- UX & Accessibility
  - Global command palette (Ctrl/⌘+K), accessible search/menus
  - Lightbox for images, scroll‑to‑top FAB, tasteful animations (framer‑motion)
  - Performance via code‑splitting, memoization, and lazy media
- Jobs & More
  - Job board routes and models (draft), AI chat endpoints (Gemini) as optional extras

## Tech Stack
- Frontend: React + Vite, React Router, Tailwind CSS, framer‑motion, axios
- Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO, Multer (memory), Cloudinary
- Infra: Render (web service + static site), Netlify/Vercel compatible static output

## Monorepo Structure
- `backend/` Express API, Socket.IO server, WebRTC signaling, Mongo models
- `frontend/` React app (Vite), UI, pages, components, sockets
- `webrtc-starter/` Minimal demo scaffolding for RTC testing

## Getting Started (Local)
1) Prereqs: Node 18+, MongoDB URI, Cloudinary account
2) Backend setup
   - Copy `backend/sample.env` to `backend/.env` and fill:
     - `MONGODB_URL`, `JWT_SECRET`
     - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
     - `CORS_ORIGINS=http://localhost:5173`
   - Install & run:
     - `cd backend`
     - `npm install`
     - `npm run dev`
3) Frontend setup
   - Create `frontend/.env`:
     - `VITE_SERVER_URL=http://localhost:8000`
   - Install & run:
     - `cd frontend`
     - `npm install`
     - `npm run dev`

Open http://localhost:5173 and sign up (OTP flow) or log in. Posting with an image will stream to Cloudinary (no local disk required).

## Deployment Notes
- Render templates provided in `render.yaml` for backend (web) and frontend (static)
- Set environment variables in the Render dashboard (Mongo/Cloudinary/JWT/CORS)
- Cookies require HTTPS in production (SameSite=None; Secure)

## Author
- Name: Yashveer Singh
- GitHub: https://github.com/yashveerji
- Host Link: https://globalconnect-ys.onrender.com
## License
This project is provided as‑is for learning/demo purposes. Add your preferred license file if you plan to distribute.