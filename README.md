# Visitor sign-in

Simple light-mode kiosk for an iPad, plus a phone admin panel.

Visitors enter their **name** and **why they want to come in**. You get the request on your phone and can **Admit** or **Decline** (with a reason). No accounts. No branding.

## Pages

| URL | Device | What it does |
|-----|--------|--------------|
| `/` | iPad (kiosk) | Sign-in form → waits → shows admitted / declined |
| `/admin` | Phone | Live request list, admit / decline, browser alerts |

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
