# Deploy (free tier, default URLs, GitHub auto-deploy)

The client and API both use a **single backend origin**: `socketOrigin()` in `poker-game/src/apiBase.ts` (from **`VITE_SOCKET_URL`**). That same value is used for **Socket.IO** and for the lobby **`POST /api/tables`** call in `LobbyPage.tsx`, so one env var covers HTTP and sockets.

Deploy the **server first**, copy its `https://…` URL, then set **`VITE_SOCKET_URL`** on the static host to that URL and deploy the client.

**Branches:** Connect both services to the same GitHub repo and branch (e.g. `main`) so every push rebuilds both.

**Node:** The repo expects **Node ≥ 24** (`engines` in root and packages). Set **`NODE_VERSION=24`** (or equivalent) on each host if builds fail on an older default.

**Yarn 4:** Root `package.json` has `"packageManager": "yarn@4.9.1"`. If the platform’s global `yarn` is v1 (common on Render), **do not** set the Render build command to `yarn install …` alone — Yarn will refuse before Corepack runs. Use the **`npm run …` scripts** below (they enable Corepack, then invoke Yarn 4).

---

## 1. API + Socket.IO — Render (Web Service)

1. In [Render](https://render.com): **New** → **Web Service** → connect the GitHub repo.
2. Use the **repository root** as the service root so `poker-shared` and workspaces resolve correctly.
3. Suggested settings:

   | Field | Value |
   |--------|--------|
   | **Build command** | **`npm run render-build`** *(recommended)* — or the same one-liner: `corepack enable && corepack prepare yarn@4.9.1 --activate && yarn install --immutable && yarn workspace poker-shared build && yarn workspace pokerserver build` |
   | **Start command** | **`npm run render-start`** *(recommended)* — or: `corepack enable && corepack prepare yarn@4.9.1 --activate && yarn workspace pokerserver start` |

4. **Environment** (optional but useful):

   | Variable | Purpose |
   |----------|---------|
   | `NODE_VERSION` | `24` |
   | `PORT` | Set automatically by Render; your server already reads `process.env.PORT`. |
   | `CORS_ORIGIN` | Optional. Leave unset for permissive dev-style CORS, or set to your static site origin (e.g. `https://your-app.pages.dev`) to restrict browser access. |

5. After the first successful deploy, copy the service URL, e.g. `https://your-service.onrender.com` (no trailing slash required for the client).

Cold starts on the free tier are normal; the first request after sleep may take a short while.

---

## 2. Static client — Cloudflare Pages (example)

Any static host with Git integration works (Netlify, Vercel, etc.). Below is a **Cloudflare Pages** layout that matches this monorepo.

1. **Pages** → **Create project** → connect the same GitHub repo and branch as Render.
2. **Build configuration:**

   | Field | Value |
   |--------|--------|
   | **Root directory** | `.` (repo root) |
   | **Build command** | **`npm run pages-build`** *(recommended)* — or the same long `corepack enable && …` line as above for shared + poker-game |
   | **Build output directory** | `poker-game/dist` |

3. **Environment variables** (Production — and Preview if you want PR previews to hit a real API):

   | Variable | Value |
   |----------|--------|
   | `NODE_VERSION` | `24` |
   | `VITE_SOCKET_URL` | `https://your-service.onrender.com` |

4. Save and deploy. Open the default Pages URL (`https://<project>.pages.dev`).

Rebuild the client whenever the Render URL changes or when you change env-dependent client code.

---

## 3. Checklist

- [ ] Render deploy is **Live** and the URL loads (HTTP 200 on the root or health behavior you expect).
- [ ] `VITE_SOCKET_URL` on the static host **exactly matches** the Render HTTPS origin (scheme + host, no path).
- [ ] If you set `CORS_ORIGIN` on the server, it includes your static site origin (comma-separated if multiple).
- [ ] After changing `VITE_SOCKET_URL`, trigger a **new client build** (push or “Retry deploy”).

---

## 4. Local parity

In dev, if `VITE_SOCKET_URL` is **not** set, the client uses the **same hostname as the page** on port 3001 (so opening `http://192.168.x.x:3000` on your phone uses `http://192.168.x.x:3001` for Socket.IO and `/api/tables`, not `127.0.0.1` on the phone). Set `VITE_SOCKET_URL` explicitly if you need a fixed backend (e.g. `http://127.0.0.1:3001` for machine-local only). Run the Vite dev server with `--host` (or `server.host: true`) so other devices can load the UI, and allow incoming connections on the poker-server port in the OS firewall if needed.
