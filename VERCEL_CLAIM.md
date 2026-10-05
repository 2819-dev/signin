# Vercel + Neon media sync

## Production
| App | URL | Vercel project |
|-----|-----|----------------|
| Synk ID | https://synkid.vercel.app | `synkid` (`prj_MD1NG822lsRstLwZwVf8zzPwzjTL`) |
| Visitor APIs | https://visitors-signin-application-kiosktab.vercel.app | claimed visitor host |
| Visitor admin | https://visitors-signin-application-kiosktab.vercel.app/admin | |

## What was broken
Community avatars / tag icons returned `Icon not found` / `Avatar not found` because
media lived in **Netlify Blobs** and Neon `kiosk_media` was empty after the Vercel move.

## Fix
Migrated public Netlify blob assets into Neon `kiosk_media` (avatars, tag icons, display image).
Member `synk-image` photos still need a signed token to export from Netlify (401); re-upload
or provide `SYNK_ADMIN_SESSION_SECRET` to finish that subset.

Script: `scripts/migrate-netlify-media-to-neon.js`
