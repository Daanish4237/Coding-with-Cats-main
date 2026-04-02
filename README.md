# 🐱 Coding with Cats

An interactive educational game that teaches Python programming through fun, game-like challenges. Players progress through 3 worlds and 15 levels, writing Python code using a visual block-based editor (Blockly) that runs real Python in the browser via Pyodide.

🌐 **Live Demo**: [coding-with-cats-main.vercel.app](https://coding-with-cats-main.vercel.app)

---

## What is this?

Coding with Cats is a browser-based coding game designed for beginners learning Python. Instead of typing code directly, players drag and drop visual blocks to build programs — making it approachable for students with no prior coding experience.

Each level presents a challenge. Solve it correctly and you earn points, climb the leaderboard, and unlock the next level. Complete all levels in a world to face the boss fight.

---

## How to Play

1. **Register** an account at `/register.html`
2. **Log in** at `/login.html`
3. You land on the **world map** — pick a level to start
4. Drag blocks from the toolbox into the workspace to build your Python program
5. Click **Run Code** to execute it
6. If your output matches the expected answer, you pass the level and earn points
7. Your score is saved to the **leaderboard** — try to beat your personal best for a streak bonus

---

## Game Structure

| World | Levels | Topics Covered |
|-------|--------|----------------|
| World 1 | 1–5 | Variables, printing, data types, input |
| World 2 | 6–10 | Conditionals, while loops, for loops, lists |
| World 3 | 11–15 | Dictionaries, functions, classes, inheritance |

Level 5, 10, and 15 are **boss fights** — harder challenges that unlock after completing the preceding levels.

### Scoring System

- Base score: 100 points per level
- Time bonus: up to +300 points for fast completions (1 point per second under 5 minutes)
- Streak multiplier: 1.5× if you beat your personal best 3 times in a row on the same level

---

## Features

- Visual block-based Python editor (Blockly) with a dark game-style theme
- Real Python execution in the browser (Pyodide / WebAssembly — no server needed for code)
- User accounts with JWT authentication
- Global leaderboard per level
- Item shop — spend earned points on cosmetic items
- Admin panel for managing levels and viewing student progress
- Background music and sound effects
- Animated UI with streak bonus banners and score reveal overlays

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript, Phaser 3 (world map) |
| Code Editor | Blockly (visual blocks) + Pyodide (Python WASM) |
| Backend | Node.js serverless functions on Vercel |
| Database | Neon PostgreSQL |
| Auth | JWT in httpOnly cookies |
| Hosting | Vercel (static + serverless) |

---

## Project Structure

```
/
├── index.html              # Main hub (Phaser 3 world map)
├── login.html              # Login page
├── register.html           # Registration page
├── admin.html              # Admin panel
├── shop.html               # Item shop
├── favicon.ico
├── vercel.json             # Vercel routing config
├── package.json
├── api/
│   ├── _db.js              # Neon DB connection pool
│   ├── _auth.js            # JWT helpers
│   ├── auth/               # register, login, check, logout
│   ├── leaderboard/        # GET scores, POST save score
│   ├── admin/              # Stage CRUD + progress reports
│   └── shop/               # Items list + purchase
├── src/
│   ├── scenes/MainHub.js   # Phaser world map scene
│   ├── blockly-theme.js    # Dark game-style Blockly theme
│   ├── main.js             # Phaser game config
│   └── world1/ world2/ world3/   # 15 levels
├── assets/
│   └── audio/              # Game audio files
├── scripts/
│   └── seed-admin.js       # Seeds the admin account
└── database/
    └── neon_schema.sql     # PostgreSQL schema
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### Setup

```bash
# Install dependencies
npm install

# Create a .env file
DATABASE_URL=your_neon_connection_string
JWT_SECRET=any_long_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password

# Run the database schema (paste neon_schema.sql into Neon SQL editor)

# Seed the admin account
node scripts/seed-admin.js

# Serve locally (any static file server works)
npx serve .
```

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel → Settings → Environment Variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
4. Deploy — Vercel auto-detects the `api/` folder as serverless functions

---

## Admin Panel

Visit `/admin.html` after logging in with admin credentials.

The admin panel lets you:
- View, add, edit, and delete game stages
- View a progress report showing each student's completed levels and total points

The admin account is seeded via `scripts/seed-admin.js` — self-registered accounts always get the `User` role.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## License

MIT
