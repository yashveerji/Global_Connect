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