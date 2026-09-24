# Claim these Vercel deployments (expires ~60 minutes from create)

**Claim ASAP** — anonymous temporary deploys expire in about an hour.

## 1) Visitor sign-in (kiosk + APIs)

- Preview: https://temporary-spry-basalt-nks4oon.vercel.app
- **Claim:** https://vercel.com/claim-deployment?code=6e1a9cbe-40d5-4072-8718-76a3419c90c3

After claiming:

1. Rename the project to `visitor-signin` (optional, for `visitor-signin.vercel.app`)
2. Set env vars on the project:
   - `DATABASE_URL` (Neon visitor-signin)
   - `ADMIN_SECRET`
   - `SYNK_ADMIN_SESSION_SECRET`
   - plus Synk admin / VAPID / Resend secrets you used on Netlify
3. Redeploy from the dashboard (or `npm run deploy:visitor` once linked)

## 2) Synk ID (member site)

- Preview: https://temporary-sonic-bamboo-9xr19k2.vercel.app
- **Claim:** https://vercel.com/claim-deployment?code=ec1aff6b-1037-4f6f-9cfe-66737d0952bc

After claiming:

1. Rename to `synkid` (optional)
2. Update `/api/*` rewrite in `synk-id/vercel.json` from the temporary visitor URL to your claimed visitor production URL (e.g. `https://visitor-signin.vercel.app/api/$1`)
3. Redeploy Synk ID

## Notes

- Media uploads now store in Neon `kiosk_media` (no Netlify Blobs).
- Existing Netlify Blob images are not auto-migrated.
- Synk ID currently proxies `/api/*` → `https://temporary-spry-basalt-nks4oon.vercel.app` until you update after claim.
