# Visitor sign-in

Simple light-mode kiosk for an iPad, plus a phone admin panel.

Visitors enter their **name** and **why they want to come in**. You get the request on your phone and can **Admit** or **Decline** (with a reason). No accounts. No branding.

**Synk** is a separate identity product. Visitor Sign-In can connect to Synk with an API key, but the products stay independent in UI and hosting.

## Pages

| URL | Device | What it does |
|-----|--------|--------------|
| `/` | iPad (kiosk) | Sign-in form → waits → shows admitted / declined |
| `/admin` | Phone | Live request list, admit / decline, browser alerts |
| Synk ID (`synk-id/`) | Phone / tablet / desktop | Synk membership request + verification (separate site) |
| Synk Admin (`synk-admin/`) | Phone / desktop | Synk Admin (separate site; username + password + 2FA) |

Legacy visitor-site paths `/synk`, `/join`, and `/synk-join` redirect to the Synk ID site.

## Stack

- Static frontend + serverless APIs on **Vercel**
- Shared API handlers under `netlify/functions/` (bridged via `api/[...path].js`)
- **Neon** (Postgres) for requests and media (`kiosk_media`)

See [`VERCEL_CLAIM.md`](./VERCEL_CLAIM.md) for temporary claim links after an anonymous deploy.

## Setup

### 1. Create the Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (`DATABASE_URL`)
3. In the Neon SQL Editor, run everything in [`schema.sql`](./schema.sql)

### 2. Deploy to Vercel

1. Claim the temporary deployments (or import this repo in the Vercel dashboard)
2. Rename projects to `visitor-signin` and `synkid` if you want those hostnames
3. Set environment variables on the **visitor** project:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your Neon connection string |
| `ADMIN_SECRET` | A long random string only you know |
| `SYNK_ADMIN_USERNAME` | Synk Admin username |
| `SYNK_ADMIN_PASSWORD_HASH` | scrypt hash from `node scripts/generate-synk-admin-credentials.js` |
| `SYNK_ADMIN_TOTP_SECRET` | Base32 TOTP secret for an authenticator app |
| `SYNK_ADMIN_SESSION_SECRET` | Long random string used to sign admin sessions |

4. Point Synk ID’s `/api/*` rewrite in `synk-id/vercel.json` at your claimed visitor production URL (for example `https://visitor-signin.vercel.app/api/$1`).
5. Redeploy both projects.

CLI helpers:

```bash
npm run deploy:visitor   # visitor kiosk + APIs
npm run deploy:synk-id   # Synk ID static site (proxies /api to visitor)
```

### 3. Use it

1. On the **iPad**, open the site root URL and put Safari in Guided Access / full screen so it stays on that page.
2. On your **phone**, open `/admin`, enter the same `ADMIN_SECRET`, and tap **Enable alerts** so new visitors ping you while the page is open.

## Local development

```bash
npm install
# put DATABASE_URL and ADMIN_SECRET in a .env file (see .env.example)
npx vercel dev
```

Then open the printed local URL (kiosk) and `/admin`.

## Notes

- There is no visitor login — only the admin secret protects `/admin` API actions.
- Alerts use the browser Notification API + a short chime while the admin page is open. Keep `/admin` open on your phone for the best experience.
- Light mode only; the kiosk UI is intentionally minimal.
- Media uploads store in Neon `kiosk_media` (no Netlify Blobs).


## Separate Synk products

- Synk ID source: `synk-id/`
- Synk Admin source: `synk-admin/`
- **Adding Synk to another app:** see [`AGENTS.md`](./AGENTS.md) and [`integrations/synk/`](./integrations/synk/) (Cursor agents should read these first).

## Separate Synk Admin site

Synk Admin is deployed as its own project:

- Source: `synk-admin/` in this repo
- APIs still run on the visitor kiosk site; Synk Admin proxies `/api/*` there
- Auth: username + password + TOTP 2FA; Synk Admin keeps a signed, **revocable** session locally
- Sessions stay signed in until you Lock or revoke them (no timed expiry)
- Manual Lock always signs out; there is no idle auto-lock
- Membership requests: Synk ID → review/accept in Synk Admin → Requests
- Member photos are served with short-lived signed URLs
- Active Synk passes can be listed and revoked from Overview / Members
- Activity is filterable and exportable as CSV
- Generate credentials: `node scripts/generate-synk-admin-credentials.js`

```bash
cd synk-admin && npm run build
# deploy with your preferred host (Vercel recommended)
```

## Separate Synk ID site

Synk membership request and verification are their own Vercel project:

- Source: `synk-id/` in this repo
- APIs still run on the visitor kiosk site; Synk ID proxies `/api/*` there
- `/` membership request · `/verify` member verification
- Visitor Sign-In may call Synk with an API key; the products otherwise remain separate
- Legacy visitor paths `/synk`, `/join`, and `/synk-join` redirect here

```bash
npm run deploy:synk-id
```
