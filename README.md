# Visitor sign-in

Simple light-mode kiosk for an iPad, plus a phone admin panel.

Visitors enter their **name** and **why they want to come in**. You get the request on your phone and can **Admit** or **Decline** (with a reason). No accounts. No branding.

## Pages

| URL | Device | What it does |
|-----|--------|--------------|
| `/` | iPad (kiosk) | Sign-in form → waits → shows admitted / declined |
| `/admin` | Phone | Live request list, admit / decline, browser alerts |
| `/synk` | Any | Public Synk ID face verify |
| [synk-admin.netlify.app](https://synk-admin.netlify.app/) | Phone / desktop | Synk Admin (separate Netlify site, own secret) |

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
| `SYNK_ADMIN_SECRET` | A **different** long random string for Synk Admin |

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
- Secret: `SYNK_ADMIN_SECRET` on the **visitor** site (not duplicated on Synk Admin)

Local:

```bash
cd synk-admin && npm run build
npx netlify deploy --prod --filter synk-admin
```
