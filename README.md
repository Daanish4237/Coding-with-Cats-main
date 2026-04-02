# 🐱 Coding with Cats

An educational Python coding game built with Phaser 3 and Blockly, deployed serverlessly on Vercel with a Neon PostgreSQL backend.

Players learn Python by solving coding challenges across 3 worlds and 15 levels, earning points, competing on leaderboards, and unlocking boss fights.

---

## Tech Stack

- **Frontend**: Phaser 3 (game hub), Blockly + Pyodide (in-level coding), plain HTML/CSS/JS
- **Backend**: Node.js serverless functions on Vercel (`/api/*`)
- **Database**: Neon PostgreSQL via `pg` driver with SSL
- **Auth**: JWT stored in httpOnly cookies (`jsonwebtoken` + `bcryptjs`)

---

## Project Structure

```
/
├── index.html              # Main hub (Phaser 3 canvas)
├── login.html              # Login page
├── register.html           # Registration page
├── admin.html              # Admin panel (stage management + reports)
├── shop.html               # Item shop
├── vercel.json             # Vercel routing config
├── package.json
├── api/
│   ├── _db.js              # Shared Neon DB pool
│   ├── _auth.js            # JWT/cookie helpers
│   ├── auth/               # register, login, check, logout
│   ├── leaderboard/        # GET leaderboard, POST save score
│   ├── admin/              # Stage CRUD + progress reports
│   └── shop/               # Items list + purchase
├── src/
│   ├── scenes/MainHub.js   # Phaser world map scene
│   ├── main.js             # Phaser game config
│   └── world1–3/           # 15 levels (Blockly + Pyodide)
├── assets/audio/           # Game audio (ogg)
├── scripts/seed-admin.js   # One-time admin account seeder
└── database/               # Reference SQL schema
```

---

## Getting Started

### Prerequisites

- Node.js + npm
- A [Neon](https://neon.tech) PostgreSQL database
- A [Vercel](https://vercel.com) account

### Local setup

```bash
npm install
```

Create a `.env` file in the root:

```env
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_random_256bit_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
```

Seed the admin account (run once after DB is provisioned):

```bash
node scripts/seed-admin.js
```

### Running tests

```bash
npx jest api/__tests__/properties/ --no-coverage --forceExit
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in Vercel
3. Add the environment variables (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`)
4. Deploy — Vercel auto-detects the `api/` folder as serverless functions

---

## Game Overview

| World | Levels | Theme |
|-------|--------|-------|
| World 1 | 1–5 | Blocky Basics (variables, types, input) |
| World 2 | 6–10 | Advanced Logic (conditionals, loops, lists) |
| World 3 | 11–15 | Master Challenges (dicts, functions, classes) |

Level 5, 10, and 15 are boss fights. Boss levels unlock after completing the preceding stage.

Players earn points based on score + time bonus. A 1.5× streak multiplier applies when beating your personal best 3 times in a row on the same stage.

---

## Notes

- Audio files in `assets/audio/` are placeholders — replace with real game audio before launch
- The `database/` folder contains the reference SQL schema; it is not deployed
- `node_modules/`, `.env` are gitignored
