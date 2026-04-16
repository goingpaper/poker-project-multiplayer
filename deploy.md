# Deploy (free tier, default URLs, GitHub auto-deploy)

The client and API both use a **single backend origin**: `socketOrigin()` in `poker-game/src/apiBase.ts` (from **`VITE_SOCKET_URL`**). That same value is used for **Socket.IO** and for the lobby **`POST /api/tables`** call in `LobbyPage.tsx`, so one env var covers HTTP and sockets.

Deploy the **server first**, copy its `https://…` URL, then set **`VITE_SOCKET_URL`** on the static host to that URL and deploy the client.

**Branches:** Connect both services to the same GitHub repo and branch (e.g. `main`) so every push rebuilds both.

**Node:** The repo expects **Node ≥ 24** (`engines` in root and packages). Set **`NODE_VERSION=24`** (or equivalent) on each host if builds fail on an older default.

---

## 1. API + Socket.IO — Render (Web Service)

1. In [Render](https://render.com): **New** → **Web Service** → connect the GitHub repo.
2. Use the **repository root** as the service root so `poker-shared` and workspaces resolve correctly.
3. Suggested settings:

   | Field | Value |
   |--------|--------|
   | **Build command** | `npm ci && npm run build -w poker-shared && npm run build -w pokerserver` |
   | **Start command** | `npm run start -w pokerserver` |

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
   | **Root directory** | `/` (repo root) |
   | **Build command** | `npm ci && npm run build -w poker-shared && npm run build -w poker-game` |
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

For local dev, `poker-game/.env.development` can set `VITE_SOCKET_URL=http://127.0.0.1:3001` so the lobby and sockets match your machine.
