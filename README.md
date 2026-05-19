# 💬 Let's Chat — Full-Stack Real-Time Messaging App

A feature-rich, WhatsApp-inspired messaging application built with a **Vanilla JavaScript + Vite** frontend and a **Laravel 10 + Sanctum** backend. Supports text, voice, image, GIF, sticker, and file messages — plus real-time voice and video calling via WebRTC.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the App](#-running-the-app)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Messaging
- **Text Messages** — Send and receive with optimistic UI updates (instant local display)
- **Voice Messages** — Record, send, and playback with duration tracking via Web Audio API
- **Image Messages** — Attach and preview images inline
- **GIF & Sticker Support** — Browse and send via GIPHY API integration
- **File Attachments** — Share documents with download links
- **1000-character limit** on frontend, 5000-character backend validation

### WhatsApp-Style Features
- **Message Status Ticks** — Single ✓ (sent), double ✓✓ (delivered), blue ✓✓ (read)
- **Online Presence** — Green dot for active users, "Last seen X min ago" for offline
- **Heartbeat System** — 30-second pulse to track real-time user presence
- **Message Privacy** — Conversations are strictly between two participants

### Voice & Video Calling
- **WebRTC-based** peer-to-peer audio/video calls
- **Custom PHP WebSocket signaling server** for call negotiation
- **ICE/STUN/TURN** server support for NAT traversal
- **Call states**: ringing → accepted → ended/declined

### UX & Design
- **Dark / Light theme toggle** with local persistence
- **Conversation caching** in localStorage for instant sidebar load
- **Route-based SPA** with hash-free client-side routing
- **Responsive layout** with sidebar, thread, and profile panels
- **Multi-language / Unicode support** including RTL-ready input
- **Emoji picker** with 50+ emojis built-in
- **Smooth transitions** and mount animations

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules), Vite 5, CSS (custom design system) |
| **Typography** | Plus Jakarta Sans, Sora (Google Fonts) |
| **Backend** | PHP 8.1+, Laravel 10 |
| **Authentication** | Laravel Sanctum (token-based) |
| **Database** | MySQL 8 (utf8mb4) |
| **Real-time Calls** | PHP WebSocket server (raw TCP sockets) + WebRTC |
| **Media API** | GIPHY API (GIFs & Stickers) |
| **Dev Server** | Vite (frontend), PHP built-in server (backend) |

---

## 🏗 Architecture Overview

```
┌────────────────────┐       HTTP/JSON        ┌───────────────────────┐
│                    │ ◄───────────────────── │                       │
│   Vite Dev Server  │       REST API          │   Laravel Backend     │
│   (port 5173)      │ ──────────────────────► │   (port 8001)         │
│                    │                         │                       │
│  ┌──────────────┐  │                         │  ┌─────────────────┐  │
│  │ SPA Router   │  │                         │  │ AuthController  │  │
│  │ State Mgmt   │  │                         │  │ ChatController  │  │
│  │ Chat Module  │  │                         │  │ CallController  │  │
│  │ Voice Module │  │                         │  │ UserController  │  │
│  │ Views (HTML) │  │                         │  │ Sanctum Auth    │  │
│  └──────────────┘  │                         │  └─────────────────┘  │
└────────────────────┘                         └──────────┬────────────┘
         │                                                │
         │              WebSocket                         │
         │ ◄──────────────────────────►                   │
         │                                                │
         │          ┌─────────────────────┐               │
         └─────────►│  PHP Signal Server  │               │
                    │  (port 8081)        │◄──────────────┘
                    │  WebRTC Signaling   │       Sanctum Token
                    └─────────────────────┘       Verification
                              │
                    ┌─────────┴──────────┐
                    │  MySQL Database     │
                    │  (chat_app)         │
                    └────────────────────┘
```

**Key design decisions:**
- **Polling-based messaging** (1.2s interval) — simple, no WebSocket dependency for chat
- **WebSocket only for calls** — the signaling server handles WebRTC negotiation
- **Token auth everywhere** — Sanctum tokens passed via `Authorization: Bearer` header
- **Local media storage** — voice/image files saved as files on disk (converted from base64 data URLs)
- **Optimistic UI** — messages appear instantly, reconciled with server on next poll

---

## 📦 Prerequisites

- **PHP** 8.1 or higher (with `pdo_mysql`, `mbstring`, `openssl` extensions)
- **Composer** 2.x
- **Node.js** 18+ and **npm** 9+
- **MySQL** 8.0+ (or MariaDB 10.4+)
- **XAMPP** (optional, provides PHP + MySQL out of the box)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chat_app_full.git
cd chat_app_full
```

### 2. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Generate application key
php artisan key:generate
```

### 3. Database Setup

Create the database and tables using the provided SQL schema:

```bash
mysql -u root -p < ../database/schema.sql
```

Or manually in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS chat_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SOURCE /path/to/chat_app_full/database/schema.sql;
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install Node dependencies
npm install

# Copy environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

### 5. Configure Environment

Edit `backend/.env`:

```env
DB_DATABASE=chat_app
DB_USERNAME=root
DB_PASSWORD=            # your MySQL password
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
VITE_GIPHY_API_KEY=your_giphy_api_key_here
```

---

## ▶️ Running the App

### Quick Start (Windows)

Double-click `start-dev.bat` in the project root — it launches both servers automatically.

### Manual Start

**Terminal 1 — Backend API:**

```bash
cd backend
php -S 127.0.0.1:8001 -t public public/index.php
```

**Terminal 2 — Frontend Dev Server:**

```bash
cd frontend
npm run dev
```

**Terminal 3 — Call Signaling Server (optional, for voice/video calls):**

```bash
cd backend
php realtime/call_signal_server.php
```

### Access the App

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://127.0.0.1:8001/api |
| **Signaling WebSocket** | ws://127.0.0.1:8081 |

> ⚠️ Always open the **frontend URL** in your browser. Do not navigate directly to the backend URL.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `APP_KEY` | Laravel encryption key | Generated via `artisan key:generate` |
| `APP_URL` | Backend base URL | `http://127.0.0.1:8001` |
| `DB_HOST` | MySQL host | `127.0.0.1` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_DATABASE` | Database name | `chat_app` |
| `DB_USERNAME` | Database user | `root` |
| `DB_PASSWORD` | Database password | _(empty)_ |
| `SANCTUM_STATEFUL_DOMAINS` | Allowed frontend origins | `localhost:5173,127.0.0.1:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API endpoint | `http://127.0.0.1:8001/api` |
| `VITE_GIPHY_API_KEY` | GIPHY API key for GIFs/stickers | _(empty — optional)_ |
| `VITE_SIGNALING_WS_URL` | WebSocket URL for call signaling | `ws://127.0.0.1:8081` |
| `VITE_WEBRTC_ICE_SERVERS` | JSON array of ICE/STUN/TURN servers | Google STUN servers |

---

## 🗄 Database Schema

The app uses 3 main tables + 1 Sanctum token table:

### `users`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT PK | Auto-increment ID |
| `name` | VARCHAR(255) | Display name |
| `email` | VARCHAR(255) UNIQUE | Login email |
| `password` | VARCHAR(255) | Bcrypt hashed |
| `is_online` | TINYINT(1) | Real-time presence flag |
| `last_seen_at` | TIMESTAMP | Last heartbeat timestamp |

### `messages`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT PK | Auto-increment ID |
| `sender_id` | FK → users | Who sent it |
| `receiver_id` | FK → users | Who receives it |
| `type` | VARCHAR | `text`, `gif`, `sticker`, `image`, `file`, `audio`, `voice` |
| `content` | TEXT | Message body |
| `media_url` | LONGTEXT | File path or external URL |
| `duration_seconds` | INT | Voice message duration |
| `delivered_at` | TIMESTAMP | When recipient's app fetched it |
| `read_at` | TIMESTAMP | When recipient opened conversation |

### `call_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT PK | Auto-increment ID |
| `caller_id` | FK → users | Call initiator |
| `callee_id` | FK → users | Call recipient |
| `type` | VARCHAR | `audio` or `video` |
| `status` | VARCHAR | `ringing`, `accepted`, `declined`, `ended` |
| `offer_sdp` / `answer_sdp` | LONGTEXT | WebRTC session descriptions |
| `caller_candidates` / `callee_candidates` | JSON | ICE candidates |

---

## 📡 API Reference

### Public Routes (no auth)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Create account → returns `{user, token}` |
| `POST` | `/api/login` | Authenticate → returns `{user, token}` |
| `GET` | `/api/media/{filename}` | Serve uploaded media files |

### Protected Routes (Bearer token required)

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/logout` | Revoke current token |
| `GET` | `/api/me` | Get authenticated user info |

#### Users & Presence
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all users (except self) with online status |
| `POST` | `/api/presence/heartbeat` | Update online presence (call every 30s) |

#### Messaging
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages/{userId}` | Fetch conversation with a user |
| `POST` | `/api/messages` | Send a message (text, voice, image, etc.) |
| `POST` | `/api/messages/delivered` | Mark pending messages as delivered |
| `POST` | `/api/messages/{userId}/read` | Mark conversation as read |
| `DELETE` | `/api/messages/{userId}` | Clear conversation history |

#### Calls
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/calls/current` | Get active call session |
| `POST` | `/api/calls` | Initiate a new call |
| `GET` | `/api/calls/{id}` | Get call session details |
| `POST` | `/api/calls/{id}/offer` | Send WebRTC offer SDP |
| `POST` | `/api/calls/{id}/answer` | Send WebRTC answer SDP |
| `POST` | `/api/calls/{id}/candidate` | Send ICE candidate |
| `POST` | `/api/calls/{id}/decline` | Decline incoming call |
| `POST` | `/api/calls/{id}/end` | End active call |

---

## 📂 Project Structure

```
chat_app_full/
├── backend/                        # Laravel 10 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php      # Login, register, logout, /me
│   │   │   │   ├── ChatController.php      # Messages, media, delivery status
│   │   │   │   ├── CallController.php      # WebRTC call session CRUD
│   │   │   │   └── UserController.php      # User list, presence heartbeat
│   │   │   ├── Middleware/                 # CORS, auth, throttling
│   │   │   └── Requests/                  # Form request validation
│   │   │       ├── Auth/                   # LoginRequest, RegisterRequest
│   │   │       ├── Calls/                  # StoreCall, Offer, Answer, Candidate
│   │   │       └── Chat/                  # StoreMessage, ConversationUser
│   │   ├── Models/
│   │   │   ├── User.php                   # Sanctum tokens, relationships
│   │   │   ├── Message.php                # Sender/receiver FKs
│   │   │   └── CallSession.php            # Caller/callee, SDP, candidates
│   │   └── Providers/
│   ├── config/                             # Laravel config files
│   ├── realtime/
│   │   └── call_signal_server.php          # Raw PHP WebSocket signaling
│   ├── routes/
│   │   └── api.php                         # All API route definitions
│   ├── storage/                            # Logs, cache, sessions
│   ├── .env / .env.example
│   └── composer.json
│
├── frontend/                       # Vanilla JS SPA (Vite)
│   ├── src/
│   │   ├── main.js                         # App bootstrap & error boundary
│   │   ├── modules/
│   │   │   ├── api.js                      # Fetch wrapper with auth headers
│   │   │   ├── app.js                      # Route renderer & page lifecycle
│   │   │   ├── auth.js                     # Login/register form handling
│   │   │   ├── chat.js                     # Core chat logic (2800+ lines)
│   │   │   │                               #   polling, calls, recording,
│   │   │   │                               #   emoji picker, themes, etc.
│   │   │   ├── config.js                   # Env var parsing, ICE config
│   │   │   ├── dom.js                      # Mount helper, animations
│   │   │   ├── events.js                   # Global click delegation (SPA nav)
│   │   │   ├── router.js                   # Client-side routing (pushState)
│   │   │   ├── state.js                    # Global state + localStorage sync
│   │   │   ├── status.js                   # Message ticks, online presence
│   │   │   ├── utils.js                    # HTML escaping utility
│   │   │   ├── views.js                    # All HTML template functions
│   │   │   └── voice.js                    # Voice recording (MediaRecorder)
│   │   └── styles/
│   │       └── app.css                     # Full design system (63KB)
│   ├── index.html                          # SPA entry point
│   ├── vite.config.js                      # Dev server + API proxy
│   ├── .env / .env.example
│   └── package.json
│
├── database/
│   └── schema.sql                  # Complete DB schema (manual setup)
│
├── docs/                           # Additional documentation
├── screenshots/                    # App screenshots
├── start-dev.bat                   # One-click Windows dev launcher
├── docker-compose.yml              # Docker config (placeholder)
├── WHATSAPP_FEATURES.md            # Feature implementation details
├── TESTING_CHECKLIST.md            # QA testing guide
└── .gitignore
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Register** two users (User A, User B) in separate browser windows
2. **Send messages** between them — verify instant display and delivery ticks
3. **Test voice messages** — hold mic button, speak, release to send
4. **Test online status** — verify green dots and "last seen" timestamps
5. **Test calls** — start the signaling server, initiate audio/video call
6. **Test privacy** — register User C, confirm they cannot see A↔B messages

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for the complete QA guide.

### Build Verification

```bash
cd frontend
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

---

## 🚢 Deployment

### Frontend

```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to any static hosting (Netlify, Vercel, Nginx, Apache).

### Backend

1. Set `APP_ENV=production` and `APP_DEBUG=false` in `.env`
2. Run `composer install --optimize-autoloader --no-dev`
3. Point your web server document root to `backend/public/`
4. Ensure the `storage/` directory is writable
5. Configure your web server to proxy all requests to `public/index.php`

### Signaling Server

Run the WebSocket signaling server as a background process:

```bash
php realtime/call_signal_server.php 0.0.0.0 8081
```

Use a process manager like **Supervisor** (Linux) or **NSSM** (Windows) for production.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
