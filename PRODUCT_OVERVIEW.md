# UIU VC Cup – Football Player Auction

## 1. What this project is

This is a **football tournament management and player auction system** for the UIU VC Cup. It combines:

- **Public site** (landing, teams, players, auction view)
- **Admin dashboard** (teams & players management, CSV import, roles)
- **Real‑time auction** (assigning players to teams with budgets)
- **Team dashboard** (for team owners, later phases)

Tech stack:

- **Next.js (App Router)** – frontend + server rendering
- **React hooks & Context** – state, authentication
- **Firebase / Firestore** – teams, players, users, auction data
- **Tailwind CSS** – styling

The current state is an **MVP** that already runs live and supports basic operations.

---

## 2. High‑level architecture

### 2.1 Core data models

These are stored in Firestore (through `firebaseService` wrappers):

- **Team**
  - `id`
  - `name`
  - `email` (team owner login)
  - `captain`, `viceCaptain`, `mentor`
  - `logo`, `color`
  - `totalBalance` (auction budget, e.g. 500,000)
  - `spent` (total confirmed auction spend)
  - optional: `ownerId`, `generatedPassword`

- **Player**
  - `id`
  - `name`
  - `uniId` (for pulling official photo)
  - `email`
  - `department`, `semester`
  - `position` (Goalkeeper, Defender, etc.)
  - `category` (A / B etc.)
  - `team` (nullable, assigned team name)
  - `soldPrice` (final auction price, nullable)

- **User / Auth**
  - Firebase Auth user
  - Role data (admin / teamOwner) stored via `userService` / Firestore

- **Auction runtime state** (mostly UI‑state on the auction page)
  - Current player list (shuffled / filtered)
  - `currentPlayerIndex`
  - `currentBids`, `highestBid`, `highestBidder`
  - `auctionTimer`, `isAuctionActive`, `isTimeExpired`

---

## 3. Current MVP features (what is working now)

### 3.1 Public landing page (`/` – `app/page.jsx`)

- Modern hero section with **Explore Teams** CTA → `/teams`
- Top navbar (desktop + mobile):
  - `HOME`, `TEAMS`, `PLAYERS`, `AUCTION`, `ABOUT`, `LOGIN`
- Mobile menu is **collapsible** and works on small screens.
- "Tournament Teams" strip at the bottom of the hero showing dynamic team data:
  - Team name
  - Short code (initials)
  - Player count

### 3.2 Public teams listing (`/teams` + individual team pages)

- Shows all registered teams with:
  - Logo / color circle
  - Team name
  - Player count
- Each card links to a team‑specific page (`/teams/[slug]`), where you can later show full squad, stats, etc.

### 3.3 Public players page (`/players` – `app/players/page.jsx`)

- Public table of **all players** with filters:
  - Filter by **team** (specific, all, unassigned)
  - Filter by **category** (A/B)
  - Filter by **position**
  - Filter by **assignment** (assigned / unassigned)
  - **Search** by name, ID, department, position, email, team
- For each player:
  - Name + pulled photo via `uniId`
  - Position, category, team (or “Unassigned”)
  - Department, semester
  - Sold price if assigned

### 3.4 Public auction page (`/auction` – `app/auction/page.jsx`)

- Admin‑driven **live auction UI**:
  - Shows current player being auctioned
  - Timer (59 seconds per player, with extend‑on‑bid logic)
  - Input to place bids from teams
  - Tracks `currentBids`, `highestBid`, `highestBidder`
- **Key rule (fixed):**
  - **No money is deducted when placing bids.**
  - Money is deducted for a team **only when a player is assigned** to that team.
- When admin confirms assignment:
  - Validates team has enough `remaining = totalBalance − spent`.
  - Sets player’s `team` and `soldPrice` in Firestore.
  - Adds bid amount to team’s `spent` field.
  - Updates UI (player removed from unassigned pool, balances updated).
- Team status panel:
  - Shows, for each team:
    - `Spent` (sum of confirmed player prices)
    - `Remaining` (`totalBalance − spent`)
    - Player count

### 3.5 Admin dashboard layout (`/dashboard` – `app/dashboard/layout.jsx`)

- Protected by `AuthContext` + `ProtectedRoute`.
- Navbar:
  - Logo + title: `UIU VC Cup – Admin`
  - Shows authenticated admin email
  - "Back to Site" and `Logout` buttons
  - **Mobile‑responsive**: collapsible menu with same links.
- Tab navigation (scrollable on small screens):
  - `Team Management` → `/dashboard/team`
  - `Player Management` → `/dashboard/player`
  - `Auction` → `/auction`

### 3.6 Admin – Team management (`/dashboard/team`)

- Admin‑only page.
- Features:
  - List all teams with columns like:
    - Team (logo, name)
    - Captain / Vice Captain
    - Mentor
    - Email
    - Password (with show/hide)
    - Players (count)
    - Actions (edit / delete)
  - CSV **import** for teams
  - **Add new team** modal (with logo upload via Cloudinary)
  - Edit existing team (change names, captain, etc.)
  - Delete team with confirmation modal
  - Vice‑captain selection UI
  - **Table is horizontally scrollable** for small screens.

### 3.7 Admin – Player management (`/dashboard/player`)

- Admin‑only page.
- Features (based on code):
  - Filters: team, category, position, assignment, role, search
  - CSV import for players
  - Add / edit / delete player
  - Bulk helpers (e.g., random assign by category – if enabled)
  - Table of players, similar to public view but richer admin controls.
  - (You can also make this table horizontally scrollable in the same pattern as teams.)

### 3.8 Auth & roles

- Admin login handled via Firebase Auth.
- `useAuth` context exposes:
  - `currentUser`, `isAdmin`, `userRole`, `logout`, etc.
- Admin routes check:
  - If **not logged in** → redirect to `/login`.
  - If user is not admin → redirect to team dashboard (`/team-dashboard`).

---

## 4. How the auction logic works (simplified flow)

1. **Admin opens `/auction`**
   - Players and teams are loaded via `playersService` and `teamsService`.
   - Teams are normalized with default `totalBalance` (e.g., 500,000) and `spent`.
2. **Select or auto‑load a player**
   - The page maintains `unassignedPlayers` and a `currentPlayerIndex`.
3. **Start auction for that player**
   - `isAuctionActive = true`
   - `auctionTimer = 59`
   - `currentBids = []`, `highestBid = 0`, `highestBidder = ''`
4. **Teams place bids (admin inputs)**
   - For each bid: validation (number, min increment, etc.).
   - `currentBids` updated; `highestBid` and `highestBidder` updated.
   - If timer < 10s and > 0, extend timer by 5s (max 59s).
   - **No balance change yet**.
5. **Timer expires OR admin decides to confirm**
   - Admin clicks "Confirm Assignment".
6. **On confirm**
   - Find `winningTeam` by `highestBidder`.
   - Compute `currentCommitted = winningTeam.spent`.
   - Ensure `remaining = totalBalance − spent` is ≥ `highestBid`.
   - If OK:
     - Update player in Firestore: set `team`, `soldPrice`.
     - Update team `spent += highestBid`.
     - Remove player from `unassignedPlayers`.
     - Reset auction state and move to next player.

This makes the financial logic **clear and safe**: only confirmed assignments move money.

---

## 5. Full operational flow – from registration to auction

Here is how a full real‑world operation can look when you take this beyond MVP.

### 5.1 Phase 1 – Admin setup

- **Define tournament rules** (outside the app, or later as settings):
  - Number of teams
  - Budget per team
  - Player categories and constraints (e.g., min 2 GKs per team)
- **Prepare CSV templates**:
  - Teams CSV (name, email, captain, mentor, logo URL…)
  - Players CSV (name, uniId, email, position, category, etc.)

### 5.2 Phase 2 – Team registration

Current & planned flow:

1. Admin collects team applications (offline or via form).
2. Admin imports teams using **Team CSV upload** in `/dashboard/team`.
   - System can also auto‑create **team owner accounts** with generated passwords.
3. Admin can edit teams, upload logos, adjust captains & mentors.
4. Optionally, send login details to team owners (email + default password).

Future extension ideas:

- Public **team registration form** that feeds directly into Firestore and waits for admin approval.
- Email verification for team owners.

### 5.3 Phase 3 – Player registration

Current & planned flow:

1. Collect player registrations (Google Form, etc.).
2. Admin cleans the data into **Player CSV** format.
3. Import via `/dashboard/player` CSV upload.
4. Admin edits / corrects entries in the Player Management page.

Future extension ideas:

- Public **player registration form** with validation.
- Automatic category assignment (A/B) based on rules.
- Prevent duplicate `uniId` and enforce constraints.

### 5.4 Phase 4 – Pre‑auction preparation

Before the live auction:

- Check that **all teams have correct `totalBalance` and `spent = 0`** (or correct seed values).
- Verify all players are present and have correct **positions & categories**.
- Optionally, lock editing for teams/players during the auction window.
- Test `/auction` with dummy data.

### 5.5 Phase 5 – Live auction operation

During the actual auction day:

1. **Admin only** has access to the control interface on `/auction`.
2. A projector / stream can show the auction page publicly.
3. Teams physically or remotely call out bids; admin inputs them.
4. Once satisfied with bidding on a player, admin confirms the winning team.
5. System updates:
   - Player is assigned and gets a `soldPrice`.
   - Team `spent` increases.
   - Public pages (`/players`, `/teams`) now reflect assignments.
6. Continue until all players in the desired categories are sold.

### 5.6 Phase 6 – Post‑auction / operations

After auction completes, the system can be used to:

- View **final squads** for each team (publicly and in admin).
- Export data for fixtures, media, and statistics.
- Track remaining budgets if there are secondary windows.

Future extension ideas:

- Match scheduling and result entry.
- Stats tracking (goals, assists, cards).
- Player performance history linked to their `uniId`.

---

## 6. What can we do next? (Roadmap ideas)

Here is a list of concrete improvements and next steps.

### 6.1 Product / UX

- **Team owner dashboard** (`/team-dashboard`):
  - View own team roster, budget, fixtures.
  - Download squad list and details.
- **Better auction spectator view**:
  - A read‑only public `/auction/view` with big fonts and animations.
  - Hide admin controls; just show current player, bids, and result.
- **Player profile pages**:
  - `/players/[id]` with photo, details, history.

### 6.2 Admin tools

- **Lock states**:
  - A flag like `auctionLocked`, `registrationLocked` to prevent late edits.
- **Validation helpers**:
  - Enforce min/max players per team and per position.
  - Warnings in dashboards.
- **Better CSV feedback**:
  - Show preview before import.
  - Show rows that failed validation.

### 6.3 Technical improvements

- Convert some client‑heavy pages to use **server components** + API routes where helpful.
- Add **unit tests** for auction logic (especially budget checks).
- Add **role‑based guards** on the server side (API level) as well.
- Improve **error reporting** (toasts/logging instead of `alert`).

---

## 7. Summary

- The app already works as an MVP for:
  - Managing teams and players via admin dashboard.
  - Running a functional player auction with correct budget handling.
  - Showing public teams and players with filters.
- It is built to be extended into a **full tournament platform**:
  - Registration → data management → auction → squads → matches & stats.
- This document should guide:
  - New developers joining the project.
  - Tournament organizers planning processes.
  - Future feature planning and prioritization.
