# Implementation Plan: Vercel Deployment

## Overview

Migrate "Coding with Cats" from PHP/MySQL to a fully serverless Vercel deployment with Node.js API routes, Neon PostgreSQL, JWT auth, admin panel, shop system, time-based scoring with streak bonuses, and game-like UI/audio.

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - Create `api/_db.js` with a `pg` Pool that reads `DATABASE_URL` from env and uses SSL (`ssl: { rejectUnauthorized: false }`)
  - Create `api/_auth.js` with `signToken`, `verifyToken`, `setCookie`, `clearCookie` helpers using `jsonwebtoken` and `cookie`
  - Create `vercel.json` with `/api/(.*)` rewrite rule
  - Update `package.json` to add `pg`, `jsonwebtoken`, `bcryptjs`, `cookie` as dependencies
  - Create `scripts/seed-admin.js` that reads `ADMIN_USERNAME`/`ADMIN_PASSWORD` from env, hashes with bcrypt, and upserts an Admin row in `students`
  - Add `base_score`, `time_bonus`, `final_score`, `completion_time_ms`, `bonus_applied` columns to the `leaderboards` table in `database/coding_with_cats.sql` using PostgreSQL syntax (`BOOLEAN` for `bonus_applied`, `uuid_generate_v4()` for UUIDs, `TEXT` for string columns)
  - _Requirements: 8.2, 8.3, 8.5, 11.2_

- [x] 2. Auth API routes
  - [x] 2.1 Implement `api/auth/register.js`
    - Validate `username`, `email`, `password` (non-empty, email format, password ≥ 6 chars)
    - Always set `role = 'User'` regardless of request body
    - Hash password with bcrypt, generate UUID for `student_id`, insert into `students`
    - Return 201 `{ success: true, username }` or appropriate 400/409
    - _Requirements: 2.1–2.7, 11.4_

  - [x] 2.2 Write property test for registration validation
    - **Property 4: Registration Input Validation**
    - **Property 11: Registration Always Assigns User Role**
    - **Validates: Requirements 2.5, 2.6, 2.7, 11.4**

  - [x] 2.3 Implement `api/auth/login.js`
    - Validate `username` and `password` fields present
    - Query `students` by username, verify bcrypt hash
    - On success: sign JWT `{ student_id, username, role }`, set httpOnly cookie, update `lastLogin`
    - Return 200 `{ success: true, username }` or 400/401
    - _Requirements: 3.1–3.7_

  - [x] 2.4 Write property test for login → check round trip
    - **Property 1: Register → Login Round Trip**
    - **Property 2: Login → Check Round Trip**
    - **Validates: Requirements 2.2, 3.2, 4.2**

  - [x] 2.5 Implement `api/auth/check.js`
    - Parse `token` cookie, call `verifyToken`
    - Return `{ authenticated: true, username, student_id }` or `{ authenticated: false }`
    - _Requirements: 4.1–4.3_

  - [x] 2.6 Implement `api/auth/logout.js`
    - Call `clearCookie`, return 200 `{ success: true }`
    - _Requirements: 5.1–5.3_

  - [x] 2.7 Write property test for logout round trip
    - **Property 3: Login → Logout → Check Round Trip**
    - **Validates: Requirements 5.2**

- [x] 3. Checkpoint — auth routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Leaderboard API routes
  - [x] 4.1 Implement `api/leaderboard/index.js` (GET)
    - Validate `stage` query param (integer 1–15)
    - Query top 10 leaderboard rows for stage joined with `students` for username, ordered by `final_score` DESC
    - Return 200 array or 400 on invalid stage
    - _Requirements: 6.1–6.6_

  - [x] 4.2 Write property test for leaderboard shape and ordering
    - **Property 5: Leaderboard Shape and Ordering**
    - **Property 6: Leaderboard Stage Validation**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

  - [x] 4.3 Implement `api/leaderboard/save.js` (POST)
    - Require valid JWT cookie; extract `student_id`
    - Validate `stage_id` (1–15), `base_score` (≥ 0), `completion_time_ms` (> 0)
    - Compute `time_bonus = max(0, floor((300000 - completion_time_ms) / 1000))`
    - Check streak: query last 2 submissions for this student+stage; if both beat previous best, set `bonus_applied = true` and multiply by 1.5
    - Compute rank, insert row, return 201 `{ success: true, final_score, rank, bonus_applied }`
    - _Requirements: 7.1–7.8_

  - [x] 4.4 Write property tests for scoring and streak
    - **Property 7: Save Score → Leaderboard Round Trip**
    - **Property 8: Rank Calculation Correctness**
    - **Property 14: Time Bonus Calculation**
    - **Property 15: Streak Multiplier Applied Correctly**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 5. Admin API routes
  - [x] 5.1 Implement `api/admin/stages.js` (GET + POST)
    - Both methods require Admin JWT (check `role === 'Admin'`; return 403 otherwise)
    - GET: return all rows from `stages`
    - POST: validate `{ name, difficulty, description, maxScore }`, insert row, return 201 with created stage
    - _Requirements: 12.3, 12.4, 12.7, 12.8_

  - [x] 5.2 Implement `api/admin/stages/[id].js` (PUT + DELETE)
    - Both methods require Admin JWT
    - PUT: update stage by `stage_id`; return 404 if not found
    - DELETE: delete stage by `stage_id`; return 404 if not found
    - _Requirements: 12.5, 12.6, 12.9_

  - [x] 5.3 Write property test for admin role enforcement
    - **Property 10: Admin Role Enforcement**
    - **Validates: Requirements 11.6, 12.7**

  - [x] 5.4 Implement `api/admin/reports/progress.js` (GET)
    - Requires Admin JWT
    - Query all students joined with `student_stages` for completed stages and scores
    - Return 200 array of `{ student_id, username, totalPoints, completedStages }`
    - _Requirements: 13.1, 13.2, 13.4_

- [x] 6. Shop API routes
  - [x] 6.1 Implement `api/shop/items.js` (GET)
    - No auth required
    - Return all rows from `items` table
    - _Requirements: 14.1, 14.2_

  - [x] 6.2 Implement `api/shop/buy.js` (POST)
    - Require valid JWT cookie
    - Validate `item_id` exists in `items`; return 404 if not
    - Check `student.totalPoints >= item.price`; return 402 if insufficient
    - Deduct price from `totalPoints`, insert into `student_items`, return 200 `{ success: true, remainingPoints }`
    - _Requirements: 14.3–14.8_

  - [x] 6.3 Write property tests for shop purchase
    - **Property 12: Shop Purchase Deducts Points Correctly**
    - **Property 13: Insufficient Points Rejected**
    - **Validates: Requirements 14.5, 14.6**

- [x] 7. Checkpoint — all API routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Convert auth pages to HTML
  - [x] 8.1 Create `login.html`
    - Port the visual design and paw-print animation from `database/login.php`
    - On form submit: `POST /api/auth/login` via fetch; redirect to `index.html` on success; display inline error on failure
    - _Requirements: 10.1–10.3, 10.7_

  - [x] 8.2 Create `register.html`
    - Port the visual design and paw-print animation from `database/register.php`
    - Remove the role selector field (always registers as User)
    - On form submit: `POST /api/auth/register` via fetch; show success message on 201; display inline error on failure
    - _Requirements: 10.4–10.7, 11.3_

- [x] 9. Update frontend API calls
  - [x] 9.1 Update `index.html`
    - Replace `fetch` to `check-auth.php` with `GET /api/auth/check`
    - Replace `href` links to `login.php` / `register.php` with `login.html` / `register.html`
    - Replace `logout.php` link with a button that calls `POST /api/auth/logout` then redirects
    - _Requirements: 9.1–9.3_

  - [x] 9.2 Update `Quiz-project/leaderboard.html`
    - Replace `fetch` to `get_leaderboard.php?stage=N` with `GET /api/leaderboard?stage=N`
    - Update response parsing to use `final_score` field
    - _Requirements: 9.4_

  - [x] 9.3 Update level completion score-saving calls in game level files
    - Replace any `save_score.php` fetch calls with `POST /api/leaderboard/save`
    - Pass `{ stage_id, base_score, completion_time_ms }` in the request body
    - Display `bonus_applied` streak banner when response includes `bonus_applied: true`
    - _Requirements: 9.5, 7.8, 16.8_

- [x] 10. Admin panel frontend
  - Create `admin.html` with three sections: Stage Management table, Add/Edit Stage form, and Progress Report table
  - On page load: call `GET /api/auth/check`; if not Admin, redirect to `index.html`
  - Wire stage CRUD buttons to `GET/POST /api/admin/stages` and `PUT/DELETE /api/admin/stages/:id`
  - Wire report section to `GET /api/admin/reports/progress`; render sortable table
  - _Requirements: 12.1, 12.2, 13.3_

- [x] 11. Shop frontend
  - Create `shop.html` that fetches `GET /api/shop/items` and renders item cards with name, type, price, and description
  - Each item card has a "Buy" button that calls `POST /api/shop/buy`
  - On success: update the displayed point balance in-place without page reload
  - On 402: show "Not enough points" inline message
  - _Requirements: 14.9, 14.10_

- [x] 12. Boss fight levels — World 2 and World 3
  - [x] 12.1 Create `src/world2/lvl5/lvl5.html` (Level 10 — Logic Master boss fight)
    - Follow the same Blockly + Pyodide structure as `src/world1/lvl5/lvl5.html`
    - On completion: call `POST /api/leaderboard/save` with `stage_id: 10`
    - _Requirements: 16.1, 16.3, 16.4_

  - [x] 12.2 Create `src/world3/lvl5/lvl5.html` (Level 15 — Ultimate Challenge boss fight)
    - Follow the same Blockly + Pyodide structure as `src/world1/lvl5/lvl5.html`
    - On completion: call `POST /api/leaderboard/save` with `stage_id: 15`
    - _Requirements: 16.2, 16.3, 16.4_

  - [x] 12.3 Add dynamic lock/unlock logic to `index.html` for boss levels
    - After `GET /api/auth/check`, fetch `GET /api/leaderboard?stage=9` and `GET /api/leaderboard?stage=14`
    - If the authenticated student has no score for those stages, disable the boss level links and show 🔒 (currently hardcoded as locked)
    - _Requirements: 16.5_

- [x] 13. Game-like UI animations and audio
  - [x] 13.1 Add CSS animations to `index.html`
    - Add `fadeInUp` keyframe for level cards on page load (staggered by index)
    - Add `box-shadow` pulse on `.level-card` hover (currently only has `translateY`, missing pulse)
    - Add animated score counter (counts from 0 to `final_score`) in level completion overlay
    - _Requirements: 16.5_

  - [x] 13.2 Add streak bonus banner to level pages
    - Create a full-screen overlay `<div id="streak-banner">` with `bounceIn` CSS animation in World 1 and World 3 boss levels
    - (World 2 boss already has `showStreakBanner()` implemented in `lvl5.js`)
    - Show it when `bonus_applied: true` is returned from `POST /api/leaderboard/save`; auto-dismiss after 2.5 seconds
    - _Requirements: 16.8_

  - [x] 13.3 Add leaderboard entry animations to `leaderboard.html`
    - Apply `slideInRight` keyframe to each `<tr>` as leaderboard data loads, staggered by row index
    - _Requirements: 16.6_

  - [x] 13.4 Add background music and sound effects
    - Add `assets/audio/` folder with placeholder audio files (`bg_music.ogg`, `sfx_level_start.ogg`, `sfx_victory.ogg`, `sfx_streak.ogg`)
    - In `index.html`: add `<audio id="bg-music" loop src="assets/audio/bg_music.ogg">` and start on first user interaction
    - Add mute/unmute 🔊/🔇 toggle button in the header; persist preference in `localStorage` under `cwc_muted`
    - In level pages: play `sfx_level_start.ogg` on load and `sfx_victory.ogg` on completion
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 14. Convert main hub to a Phaser scene
  - [x] 14.1 Create `src/scenes/MainHub.js` Phaser Scene
    - Implement a Phaser Scene class `MainHub` that renders the world map as interactive game objects (world banners, level buttons as Phaser `Text` or `Image` objects)
    - On scene `create()`: call `GET /api/auth/check` and display username or login/register buttons as Phaser UI elements
    - Use Phaser's `this.sound` manager to play `bg_music` on scene start (respects `cwc_muted` from `localStorage`)
    - Add hover tween (scale up) and click handler on each level button that navigates to the corresponding level HTML page
    - _Requirements: 16.1, 16.2, 16.5_

  - [x] 14.2 Update `src/main.js` to use `MainHub` scene
    - Add `MainHub` to the Phaser game config `scene` array as the first scene
    - Remove or repurpose the existing `Start` scene if it overlaps with `MainHub`
    - _Requirements: 16.5_

  - [x] 14.3 Update `index.html` to host the Phaser canvas
    - Replace the static HTML world map markup with a `<div id="game-container">` that Phaser mounts into
    - Keep the `<header>` outside the canvas for login/register/logout links (plain HTML, not Phaser)
    - _Requirements: 1.1, 16.5_

- [x] 15. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations each
- Unit tests use Jest
- The `scripts/seed-admin.js` script must be run once after the Neon PostgreSQL database is provisioned
- Audio files in `assets/audio/` are placeholders — replace with actual game audio before launch
- The Phaser main hub (Task 14) keeps login/register/admin/shop as plain HTML pages — only the world map and level selection move into Phaser
