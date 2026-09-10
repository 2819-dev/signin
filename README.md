# Visitor sign-in

Simple light-mode kiosk for an iPad, plus a phone admin panel.

Visitors enter their **name** and **why they want to come in**. You get the request on your phone and can **Admit** or **Decline** (with a reason). No accounts. No branding.

**Synk** is a separate identity product. Visitor Sign-In can connect to Synk with an API key, but the products stay independent in UI and hosting.

## Pages

| URL | Device | What it does |
|-----|--------|--------------|
| `/` | iPad (kiosk) | Sign-in form → waits → shows admitted / declined |
| `/admin` | Phone | Live request list, admit / decline, browser alerts |
| [synkid.netlify.app](https://synkid.netlify.app/) | Phone / tablet / desktop | Synk membership request + verification (separate site) |
| [synk-admin.netlify.app](https://synk-admin.netlify.app/) | Phone / desktop | Synk Admin (separate site; username + password + 2FA) |

Legacy visitor-site paths `/synk`, `/join`, and `/synk-join` redirect to the Synk ID site.

## Stack

- Static frontend on **Netlify**
- Serverless functions under `/api/*`
- **Neon** (Postgres) for requests

## Setup

### 1. Create the Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (`DATABASE_URL`)
3. In the Neon SQL Editor, run everything in [`schema.sql`](./schema.sql)

### 2. Deploy to Netlify

1. Push this repo and import it in Netlify (or use Netlify CLI)
2. Set environment variables in **Site settings → Environment variables**:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your Neon connection string |
| `ADMIN_SECRET` | A long random string only you know |
| `SYNK_ADMIN_USERNAME` | Synk Admin username |
| `SYNK_ADMIN_PASSWORD_HASH` | scrypt hash from `node scripts/generate-synk-admin-credentials.js` |
| `SYNK_ADMIN_TOTP_SECRET` | Base32 TOTP secret for an authenticator app |
| `SYNK_ADMIN_SESSION_SECRET` | Long random string used to sign admin sessions |

3. Deploy. Publish directory is `public`; functions are in `netlify/functions`.

### 3. Use it

1. On the **iPad**, open the site root URL and put Safari in Guided Access / full screen so it stays on that page.
2. On your **phone**, open `/admin`, enter the same `ADMIN_SECRET`, and tap **Enable alerts** so new visitors ping you while the page is open.

## Local development

```bash
npm install
npx netlify login
# put DATABASE_URL and ADMIN_SECRET in a .env file (see .env.example)
npx netlify dev
```

Then open `http://localhost:8888` (kiosk) and `http://localhost:8888/admin`.

## Notes

- There is no visitor login — only the admin secret protects `/admin` API actions.
- Alerts use the browser Notification API + a short chime while the admin page is open. Keep `/admin` open on your phone for the best experience.
- Light mode only; the kiosk UI is intentionally minimal.


## Separate Synk Admin site

Synk Admin is deployed as its own Netlify project:

- Site: https://synk-admin.netlify.app
- Source: `synk-admin/` in this repo
- APIs still run on the visitor kiosk site; Synk Admin proxies `/api/*` there
- Auth: username + password + TOTP 2FA; Synk Admin keeps a signed, **revocable** session locally
- **Stay signed in** is per device (about 2 months). Turn it off on shared tablets so each visit needs a fresh login
- Manual Lock always signs out; there is no idle auto-lock and no short forced expiry while remembered
- Membership requests: [synkid.netlify.app](https://synkid.netlify.app/) → review/accept in Synk Admin → Requests
- Member photos are served with short-lived signed URLs
- Active Synk passes can be listed and revoked from Overview / Members
- Activity is filterable and exportable as CSV
- Generate credentials: `node scripts/generate-synk-admin-credentials.js`

Local:

```bash
cd synk-admin && npm run build
npx netlify deploy --prod --filter synk-admin
```

## Separate Synk ID site

Synk membership request and verification are deployed as their own Netlify project:

- Site: https://synkid.netlify.app
- Source: `synk-id/` in this repo
- APIs still run on the visitor kiosk site; Synk ID proxies `/api/*` there
- `/` membership request · `/verify` member verification
- Visitor Sign-In may call Synk with an API key; the products otherwise remain separate
- Legacy visitor paths `/synk`, `/join`, and `/synk-join` redirect here

```bash
npm run deploy:synk-id
```
