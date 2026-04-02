# Requirements Document

## Introduction

This feature migrates the "Coding with Cats" Phaser.js + Blockly educational game from a local PHP/MySQL stack to a fully serverless deployment on Vercel. The migration replaces PHP session-based authentication and PHP leaderboard endpoints with Node.js serverless API routes, replaces PHP sessions with JWT stored in httpOnly cookies, and connects to a cloud MySQL database (PlanetScale). The static frontend (HTML/CSS/JS/assets) is served directly by Vercel's CDN. Login and register pages are converted from PHP to plain HTML with JavaScript fetch calls. The deployment also includes an admin panel for managing levels and generating progress reports, a shop system where students spend earned points on cosmetic items, fixed admin credentials seeded at deploy time, and completion of boss fight levels for Worlds 2 and 3.

## Glossary

- **API_Server**: The collection of Node.js serverless functions deployed under `/api/` on Vercel
- **Auth_Service**: The subset of API_Server routes responsible for registration, login, session check, and logout
- **Leaderboard_Service**: The subset of API_Server routes responsible for reading and writing leaderboard scores
- **Admin_Service**: The subset of API_Server routes restricted to Admin role users, for managing stages and reports
- **Shop_Service**: The subset of API_Server routes for browsing and purchasing cosmetic items
- **JWT**: JSON Web Token — a signed, stateless token used to identify authenticated users
- **httpOnly_Cookie**: A browser cookie inaccessible to JavaScript, used to store the JWT securely
- **DB**: The cloud MySQL database (PlanetScale) that stores users, students, leaderboards, stages, items, and student_items
- **Frontend**: All static files (HTML, CSS, JS, assets) served by Vercel's CDN
- **vercel.json**: The Vercel project configuration file that defines routing and build settings
- **Student**: A registered user of the game with role "User", stored in the `students` table
- **Admin**: A privileged user with role "Admin", seeded at deploy time with a fixed username and password
- **Stage**: A numbered game level (1–15) corresponding to a row in the `stages` table
- **Item**: A purchasable cosmetic in the `items` table
- **Boss_Level**: The fifth level of each world (levels 5, 10, 15) — a boss fight stage

## Requirements

### Requirement 1: Static Frontend Hosting

**User Story:** As a player, I want to access the game through a public URL, so that I can play without installing anything locally.

#### Acceptance Criteria

1. THE Frontend SHALL be served from Vercel's CDN at the project's root URL
2. WHEN a browser requests any static file (HTML, CSS, JS, image, or asset), THE Frontend SHALL respond with the correct file and appropriate cache headers
3. THE vercel.json SHALL configure all `/api/*` requests to route to serverless functions and all other requests to serve static files
4. WHEN a browser requests a path that does not match any static file or API route, THE Frontend SHALL serve `index.html` as a fallback

---

### Requirement 2: User Registration

**User Story:** As a new player, I want to create an account, so that my progress and scores are saved under my identity.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/auth/register` endpoint
2. WHEN a `POST /api/auth/register` request is received with a valid `username`, `email`, and `password`, THE Auth_Service SHALL hash the password using bcrypt and insert a new row into the `students` table
3. WHEN registration succeeds, THE Auth_Service SHALL return HTTP 201 with a JSON body containing `{ success: true, username }`
4. IF a `POST /api/auth/register` request is received with a `username` or `email` that already exists in the DB, THEN THE Auth_Service SHALL return HTTP 409 with a JSON error message
5. IF a `POST /api/auth/register` request is received with a missing or empty `username`, `email`, or `password`, THEN THE Auth_Service SHALL return HTTP 400 with a JSON error message
6. IF a `POST /api/auth/register` request is received with a `password` shorter than 6 characters, THEN THE Auth_Service SHALL return HTTP 400 with a JSON error message
7. IF a `POST /api/auth/register` request is received with an `email` that does not match a valid email format, THEN THE Auth_Service SHALL return HTTP 400 with a JSON error message

---

### Requirement 3: User Login

**User Story:** As a returning player, I want to log in with my username and password, so that I can access my saved progress.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/auth/login` endpoint
2. WHEN a `POST /api/auth/login` request is received with a valid `username` and matching `password`, THE Auth_Service SHALL sign a JWT containing `{ student_id, username, role }` and set it as an httpOnly_Cookie named `token` with `SameSite=Strict` and `Secure` flags
3. WHEN login succeeds, THE Auth_Service SHALL return HTTP 200 with a JSON body containing `{ success: true, username }`
4. WHEN login succeeds, THE Auth_Service SHALL update the `lastLogin` timestamp for the student in the DB
5. IF a `POST /api/auth/login` request is received with a `username` that does not exist in the DB, THEN THE Auth_Service SHALL return HTTP 401 with a JSON error message
6. IF a `POST /api/auth/login` request is received with an incorrect `password`, THEN THE Auth_Service SHALL return HTTP 401 with a JSON error message
7. IF a `POST /api/auth/login` request is received with a missing `username` or `password`, THEN THE Auth_Service SHALL return HTTP 400 with a JSON error message

---

### Requirement 4: Authentication Check

**User Story:** As a player, I want the page to show my username and a logout button when I am logged in, so that I know my session is active.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `GET /api/auth/check` endpoint
2. WHEN a `GET /api/auth/check` request is received with a valid, unexpired JWT in the `token` httpOnly_Cookie, THE Auth_Service SHALL return HTTP 200 with `{ authenticated: true, username, student_id }`
3. WHEN a `GET /api/auth/check` request is received with no cookie or an invalid/expired JWT, THE Auth_Service SHALL return HTTP 200 with `{ authenticated: false }`
4. THE Frontend SHALL call `GET /api/auth/check` on page load and display the username and logout button WHEN `authenticated` is `true`
5. THE Frontend SHALL display login and register buttons WHEN `authenticated` is `false`

---

### Requirement 5: Logout

**User Story:** As a player, I want to log out, so that my session is cleared on shared devices.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/auth/logout` endpoint
2. WHEN a `POST /api/auth/logout` request is received, THE Auth_Service SHALL clear the `token` httpOnly_Cookie by setting it with `Max-Age=0`
3. WHEN logout succeeds, THE Auth_Service SHALL return HTTP 200 with `{ success: true }`

---

### Requirement 6: Leaderboard Read

**User Story:** As a player, I want to view the top scores for each stage, so that I can see how I compare to others.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL expose a `GET /api/leaderboard` endpoint
2. WHEN a `GET /api/leaderboard?stage=N` request is received with a valid stage number (1–15), THE Leaderboard_Service SHALL return HTTP 200 with a JSON array of the top 10 scores for that stage, ordered by score descending
3. Each entry in the returned array SHALL contain `{ student_id, username, score, stage_id, rank, recordedAt }`
4. IF a `GET /api/leaderboard` request is received with a missing `stage` parameter, THEN THE Leaderboard_Service SHALL return HTTP 400 with a JSON error message
5. IF a `GET /api/leaderboard` request is received with a `stage` value outside the range 1–15, THEN THE Leaderboard_Service SHALL return HTTP 400 with a JSON error message
6. WHEN no scores exist for the requested stage, THE Leaderboard_Service SHALL return HTTP 200 with an empty array

---

### Requirement 7: Leaderboard Score Save

**User Story:** As a player, I want my score saved to the leaderboard when I complete a stage, so that my achievement is recorded.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL expose a `POST /api/leaderboard/save` endpoint
2. WHEN a `POST /api/leaderboard/save` request is received with a valid JWT cookie, a valid `stage_id` (1–15), a non-negative integer `base_score`, and a positive integer `completion_time_ms`, THE Leaderboard_Service SHALL compute the final score, insert a new row into the `leaderboards` table, and return HTTP 201 with `{ success: true, final_score, rank, bonus_applied }`
3. THE Leaderboard_Service SHALL compute the final score as: `final_score = base_score + time_bonus`, where `time_bonus = max(0, floor((300000 - completion_time_ms) / 1000))` (300 seconds maximum; each second faster than 300s adds 1 bonus point)
4. WHEN a student completes the same stage 3 times in a row with a `final_score` greater than their previous best for that stage, THE Leaderboard_Service SHALL apply a 1.5× multiplier to the `final_score` for that submission and record `bonus_applied = true`
5. WHEN a score is saved, THE Leaderboard_Service SHALL calculate the rank as the count of existing scores for that stage that are strictly greater than the submitted `final_score`, plus one
6. IF a `POST /api/leaderboard/save` request is received without a valid JWT cookie, THEN THE Leaderboard_Service SHALL return HTTP 401 with a JSON error message
7. IF a `POST /api/leaderboard/save` request is received with a `stage_id` outside 1–15, THEN THE Leaderboard_Service SHALL return HTTP 400 with a JSON error message
8. IF a `POST /api/leaderboard/save` request is received with a negative `base_score` or a non-positive `completion_time_ms`, THEN THE Leaderboard_Service SHALL return HTTP 400 with a JSON error message

---

### Requirement 8: Cloud Database Setup

**User Story:** As a developer, I want the application to connect to a cloud MySQL database, so that data persists across serverless function invocations.

#### Acceptance Criteria

1. THE DB SHALL be a PlanetScale MySQL-compatible database containing the existing schema (students, leaderboards, stages tables at minimum)
2. THE API_Server SHALL read DB connection credentials exclusively from environment variables (`DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
3. THE API_Server SHALL read the JWT signing secret exclusively from the `JWT_SECRET` environment variable
4. IF any required environment variable is missing at function startup, THEN THE API_Server SHALL return HTTP 500 with a JSON error message for any request
5. THE DB connection SHALL use SSL when connecting to PlanetScale

---

### Requirement 9: Frontend API Integration

**User Story:** As a developer, I want all frontend JavaScript to call `/api/*` routes instead of `.php` files, so that the app works on Vercel without PHP.

#### Acceptance Criteria

1. THE Frontend SHALL replace all `fetch` calls targeting `*.php` files with equivalent calls to the corresponding `/api/*` routes
2. THE Frontend SHALL replace the `href` links to `login.php`, `register.php`, and `logout.php` with links to the new HTML pages and a fetch call to `POST /api/auth/logout`
3. THE Frontend SHALL call `GET /api/auth/check` (replacing `check-auth.php`) on page load to determine auth state
4. THE Leaderboard_Service client code in `leaderboard.html` SHALL call `GET /api/leaderboard?stage=N` (replacing `get_leaderboard.php`)
5. THE Frontend score-saving code SHALL call `POST /api/leaderboard/save` (replacing `save_score.php`)

---

### Requirement 10: Auth Page Conversion

**User Story:** As a developer, I want the login and register pages to be plain HTML files with JavaScript fetch calls, so that they work on Vercel without a PHP runtime.

#### Acceptance Criteria

1. THE Frontend SHALL provide a `login.html` file that renders the same visual design as the existing `login.php`
2. WHEN a user submits the login form in `login.html`, THE Frontend SHALL send a `POST /api/auth/login` fetch request and redirect to `index.html` on success
3. WHEN a login fetch request returns an error, THE Frontend SHALL display the error message inline without a page reload
4. THE Frontend SHALL provide a `register.html` file that renders the same visual design as the existing `register.php`
5. WHEN a user submits the registration form in `register.html`, THE Frontend SHALL send a `POST /api/auth/register` fetch request and display a success message on HTTP 201
6. WHEN a registration fetch request returns an error, THE Frontend SHALL display the error message inline without a page reload
7. THE Frontend SHALL preserve the paw-print animated background from the original PHP pages in both `login.html` and `register.html`

---

### Requirement 11: Admin Authentication and Fixed Credentials

**User Story:** As a system administrator, I want a fixed admin account seeded at deploy time, so that regular players cannot self-register as admins.

#### Acceptance Criteria

1. THE DB SHALL contain a seeded Admin account with a fixed `username` and bcrypt-hashed `password` stored in the `students` table with `role = 'Admin'`
2. THE Auth_Service SHALL read the admin username and password from environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) during the database seed script
3. THE Frontend registration form SHALL NOT include a role selector field — all self-registered accounts SHALL receive `role = 'User'`
4. WHEN a `POST /api/auth/register` request is received, THE Auth_Service SHALL always assign `role = 'User'` regardless of any `role` field in the request body
5. WHEN a user with `role = 'Admin'` logs in, THE Auth_Service SHALL include `role: 'Admin'` in the JWT payload
6. THE Admin_Service SHALL reject any request whose JWT does not contain `role = 'Admin'` with HTTP 403

---

### Requirement 12: Admin Panel — Stage Management

**User Story:** As an admin, I want to add, edit, and delete game levels from a web interface, so that I can manage the game content without touching the database directly.

#### Acceptance Criteria

1. THE Frontend SHALL provide an `admin.html` page accessible only to authenticated Admin users
2. WHEN a non-admin user navigates to `admin.html`, THE Frontend SHALL redirect to `index.html`
3. THE Admin_Service SHALL expose a `GET /api/admin/stages` endpoint that returns all rows from the `stages` table
4. THE Admin_Service SHALL expose a `POST /api/admin/stages` endpoint that inserts a new stage row given `{ name, difficulty, description, maxScore }`
5. THE Admin_Service SHALL expose a `PUT /api/admin/stages/:id` endpoint that updates an existing stage row
6. THE Admin_Service SHALL expose a `DELETE /api/admin/stages/:id` endpoint that removes a stage row
7. IF any Admin_Service request is received without a valid Admin JWT, THEN THE Admin_Service SHALL return HTTP 403
8. WHEN a stage is created via `POST /api/admin/stages`, THE Admin_Service SHALL return HTTP 201 with the created stage object
9. IF a `PUT` or `DELETE` request targets a `stage_id` that does not exist, THEN THE Admin_Service SHALL return HTTP 404

---

### Requirement 13: Admin Panel — Student Progress Reports

**User Story:** As an admin, I want to view a report of student progress across all stages, so that I can monitor learning outcomes.

#### Acceptance Criteria

1. THE Admin_Service SHALL expose a `GET /api/admin/reports/progress` endpoint that returns a list of all students with their completed stages, scores, and total points
2. WHEN a `GET /api/admin/reports/progress` request is received with a valid Admin JWT, THE Admin_Service SHALL return HTTP 200 with an array of `{ student_id, username, totalPoints, completedStages: [{ stage_id, score, completedAt }] }`
3. THE Frontend `admin.html` page SHALL display the progress report in a sortable table
4. IF a `GET /api/admin/reports/progress` request is received without a valid Admin JWT, THEN THE Admin_Service SHALL return HTTP 403

---

### Requirement 14: Shop System

**User Story:** As a player, I want to spend points earned from completing stages to buy cosmetic items, so that I can personalise my experience.

#### Acceptance Criteria

1. THE Shop_Service SHALL expose a `GET /api/shop/items` endpoint that returns all rows from the `items` table
2. WHEN a `GET /api/shop/items` request is received, THE Shop_Service SHALL return HTTP 200 with an array of `{ item_id, name, type, price, description }`
3. THE Shop_Service SHALL expose a `POST /api/shop/buy` endpoint
4. WHEN a `POST /api/shop/buy` request is received with a valid JWT cookie and a valid `item_id`, THE Shop_Service SHALL check that the student's `totalPoints` is greater than or equal to the item's `price`
5. WHEN a purchase is valid, THE Shop_Service SHALL deduct the item price from the student's `totalPoints`, insert a row into `student_items`, and return HTTP 200 with `{ success: true, remainingPoints }`
6. IF the student's `totalPoints` is less than the item's `price`, THEN THE Shop_Service SHALL return HTTP 402 with a JSON error message
7. IF a `POST /api/shop/buy` request is received without a valid JWT cookie, THEN THE Shop_Service SHALL return HTTP 401
8. IF a `POST /api/shop/buy` request is received with an `item_id` that does not exist in the `items` table, THEN THE Shop_Service SHALL return HTTP 404
9. THE Frontend SHALL provide a `shop.html` page that displays available items and allows authenticated students to purchase them
10. WHEN a purchase succeeds, THE Frontend SHALL update the displayed point balance without a full page reload

---

### Requirement 16: Game-Like UI Animations and Music

**User Story:** As a player, I want the website to feel like a game with animations and music, so that the experience is engaging and fun.

#### Acceptance Criteria

1. THE Frontend `index.html` SHALL play background music on user interaction (click or keypress) using the Web Audio API or an HTML `<audio>` element with a looping game soundtrack
2. THE Frontend SHALL provide a mute/unmute toggle button that persists the user's preference in `localStorage`
3. WHEN a player navigates to a level page, THE Frontend SHALL play a level-start sound effect
4. WHEN a player completes a level, THE Frontend SHALL play a victory sound effect and display an animated score reveal
5. THE Frontend `index.html` SHALL display animated CSS transitions on level cards (hover lift, pulse on unlock)
6. THE Frontend leaderboard page SHALL animate new entries sliding in when the leaderboard data loads
7. THE Frontend `login.html` and `register.html` SHALL retain the existing paw-print stamp animation as the background
8. WHEN a player earns a streak bonus, THE Frontend SHALL display a full-screen animated banner (e.g., "🔥 Streak Bonus x1.5!") before showing the final score

**User Story:** As a player, I want to play the boss fight levels for Worlds 2 and 3, so that I can complete all worlds in the game.

#### Acceptance Criteria

1. THE Frontend SHALL provide a fully playable boss fight level at `src/world2/lvl5/lvl5.html` (Level 10 — Logic Master)
2. THE Frontend SHALL provide a fully playable boss fight level at `src/world3/lvl5/lvl5.html` (Level 15 — Ultimate Challenge)
3. WHEN a player completes a boss fight level, THE Frontend SHALL call `POST /api/leaderboard/save` with the player's score and the corresponding `stage_id`
4. THE boss fight levels SHALL follow the same Blockly + Pyodide structure as the existing World 1 boss fight (`src/world1/lvl5/lvl5.html`)
5. WHEN a player has not yet completed the prerequisite levels (levels 6–9 for World 2, levels 11–14 for World 3), THE Frontend SHALL display the boss level as locked
