# Fix domain / Failed to fetch (claim ASAP — ~60 min)

## What broke
`https://synkid.vercel.app` still proxied `/api/*` to an **expired temporary** visitor URL.
Camera verify then showed **Failed to fetch**. Neon DB itself is fine
(`visitor-signin` / `curly-king-18967420`, 4 profiles, synk tables + `kiosk_media` present).

## Claim these (move your domains onto them)

### 1) Synk ID — **required for login/verify**
- Preview: https://temporary-swift-tin-n8r4l1l.vercel.app
- **Claim:** https://vercel.com/claim-deployment?code=5f451fdb-7cca-49ee-adad-ff750605c935
- After claim → **Domains** → add `synkid.vercel.app` (move it off the old broken project)

### 2) Visitor APIs (optional upgrade; current claimed visitor already works)
- Preview: https://temporary-flying-walnut-1m4zg68.vercel.app
- **Claim:** https://vercel.com/claim-deployment?code=1ab53652-10c5-4e70-b1eb-260935fe0469
- After claim → Domains → add `visitors-signin-application-kiosktab.vercel.app`
- Copy env from the old visitor project: `DATABASE_URL`, `ADMIN_SECRET`, `SYNK_ADMIN_*`, VAPID, Resend
- Then update Synk’s `/api` rewrite to the new visitor host and redeploy Synk

### 3) Synk Admin (Netlify is out of credits)
- Preview: https://temporary-agile-sitar-0woiami.vercel.app
- **Claim:** https://vercel.com/claim-deployment?code=8581f4dd-8860-47ca-9a94-ba8e23d820f7
- Rename project e.g. `synk-admin`

## Admin / app URLs (after domains are attached)

| What | URL |
|------|-----|
| Synk login / camera verify | https://synkid.vercel.app/verify |
| Synk hub | https://synkid.vercel.app/hub |
| Synk Business | https://synkid.vercel.app/business |
| Visitor kiosk | https://visitors-signin-application-kiosktab.vercel.app/ |
| Visitor phone admin | https://visitors-signin-application-kiosktab.vercel.app/admin |
| Synk Admin | claimed admin project URL above |

## Verify it worked
```bash
curl -s -X POST https://synkid.vercel.app/api/synk-auth \
  -H 'Content-Type: application/json' -d '{"appSlug":"synk"}'
# expect JSON like {"error":"Verification failed"} — NOT "Redirecting..."
```
