# Quizzettone — Agent Guide

## Structure

Monorepo with two independent packages (no npm workspaces):

- `backend-quizzettone/` — Node.js WebSocket server (port 3000). Single entry: `server.js`. Depends only on `ws`.
- `frontend-quizzettone/` — Vite + React 19 SPA. Entry: `src/main.jsx`. Uses `react-router-dom` v7.

Each package has its own `package.json`, `node_modules/`, and `package-lock.json` (gitignored).

## Commands

| Package | Command | What it does |
|---|---|---|
| backend | `npm run dev` | `node --env-file=.env --watch server.js` (loads `.env`, uses Node built-in `--watch`) |
| frontend | `npm run dev` | `vite` |
| frontend | `npm run build` | `vite build` |
| frontend | `npm run lint` | `eslint .` (flat config) |
| frontend | `npm run preview` | `vite preview` |

No test runner exists. No CI/CD.

## Network setup

- Backend hardcodes `ws://192.168.1.86:3000` in both `server.js:349` and `useQuizSocket.jsx:14`.
- Frontend dev: use `npm run dev -- --host` (or set `server.host: true` in `vite.config.js`) for LAN access.
- Admin password loaded from `backend-quizzettone/.env` via `ADMIN_PASSWORD`. Copy `.env.example` to `.env` to configure. Both local and WebSocket auth use the same env variable.
- Client-side `useAdminAuth` hardcodes password `quiz123` as fallback — must match the `.env` value.

## Routes

- `/` — Player buzz-in page (`QuizButton.jsx`)
- `/admin` — Admin dashboard (`Admin.jsx`)

## Key conventions

- `react/prop-types` rule is off (no eslint config for it, no PropTypes used).
- `App.css` import is commented out in `App.jsx`; all styling is inline.
- Player identity persisted in localStorage keys: `quiz_player_id` (UUID), `quiz_player_name`.
- Admin auth persisted in localStorage keys: `quiz_admin_logged`, `quiz_admin_password`.
- WebSocket message queue in `useQuizSocket` buffers sends if socket isn't OPEN yet (avoids race conditions).
- `onMouseDown` instead of `onClick` on the BUZZ button for lower latency.
- Server keeps `registeredPlayers` (persistent identity across reconnects) separate from `connectedPlayers` (live sessions). Player refresh preserves their identity and `canBuzz` permission.
- `PLAYER_UNREGISTER` must be sent *before* clearing localStorage + reloading for "Entra come nuovo giocatore".
- Admin login password is also sent to the WebSocket server via `sendAdminLogin` on mount/refresh to authenticate the socket role; this is separate from the client-side `useAdminAuth` login.

## Architecture notes

- All game state lives in server RAM (no database).
- Admin can toggle each player's `canBuzz` permission; players start blocked.
- `RESET` (quiz reset) only works when sent by a socket with `role === 'admin'`.
- `ADMIN_FORCE_RESET_PLAYER` deletes the player from both `connectedPlayers` and `registeredPlayers` and sends `FORCE_RESET` to the client, which calls `resetPlayerId()` + `location.reload()`.
- Scores live in a server-side `scores` Map, not in localStorage. Survives player reconnects and admin refreshes. Reset via `ADMIN_RESET_SCORES` (admin-only). Removed with player via `ADMIN_FORCE_RESET_PLAYER`. Broadcast as `{ type: 'SCORES_UPDATE', scores: [{id, name, score}] }`.
