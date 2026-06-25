# NexaChat

Connect. Chat. Stay Together.

A production-ready MERN real-time chat application built for real users across multiple devices and browsers.

## Features

- Register, login, logout, protected routes, JWT auth, bcrypt password hashing
- Login persistence with HTTP-only cookie plus bearer-token fallback
- Registration and profile avatar upload
- Online and offline presence
- Last seen profile details
- User search and registered-user directory
- One-to-one real-time messaging with Socket.io
- Typing indicators, timestamps, delivered and seen states
- NexaBot welcome message for every new account
- MongoDB-backed message history
- Dark responsive WhatsApp and Discord inspired interface
- Toast notifications, loading states, skeleton loaders

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB running locally or a MongoDB Atlas connection string

## Environment Setup

Backend:

```bash
cd backend
cp .env.example .env
```

Update `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nexachat
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

Update `frontend/.env` if needed:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Install

From the project root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run

Start MongoDB first.

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Production Build

```bash
cd frontend
npm run build
```

```bash
cd backend
npm start
```

## Deployment

Backend on Railway:

1. Create a Railway service from the `backend` folder.
2. Set `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, and optional Cloudinary variables.
3. Use `npm start` as the start command.

Frontend on Vercel:

1. Create a Vercel project from the `frontend` folder.
2. Set `VITE_API_URL` to `https://your-railway-app.up.railway.app/api`.
3. Set `VITE_SOCKET_URL` to `https://your-railway-app.up.railway.app`.
4. Deploy after the backend URL is live.

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/profile/me`
- `GET /api/messages/:receiverId`
- `POST /api/messages/send/:receiverId`

## Socket Events

- `connection`
- `disconnect`
- `user-online`
- `user-offline`
- `online-users`
- `typing`
- `stop-typing`
- `send-message`
- `receive-message`
- `message-delivered`
- `message-seen`
