# Synk — agent integration guide

This repository powers **Synk**, a standalone identity membership (face / recovery-code verify → short-lived pass).

When building **another product** for this user and they ask to “add Synk”, follow this guide. Do not invent OAuth or password logins for Synk.

## Product boundaries

| Product | Site | Purpose |
|---------|------|---------|
| Synk ID | `https://synkid.netlify.app` | Member join, verify, hub, Community |
| Synk Admin | `https://synk-admin.netlify.app` | Staff tools |
| Synk Business | `/business` on Synk ID | API keys + app pairing |
| Visitor Sign-In | `https://visitor-signin-kiosk.netlify.app` | Separate kiosk product; hosts Synk APIs |

Synk answers **who is this?** Your product decides **what happens next**.

## Fastest integration (copy this)

### 1) Browser — send the member to Synk

```html
<script src="https://synkid.netlify.app/sdk.js"></script>
<script>
  document.getElementById("synk-btn").onclick = () => {
    Synk.signIn({
      app: "my-app-slug",          // paired app slug from Synk Business
      returnTo: location.href,     // Synk redirects back here with ?synk_pass=
      intent: "identity",
    });
  };
</script>
```

Or without the SDK:

`https://synkid.netlify.app/verify?app=MY_APP&intent=identity&return=https://myapp.example/callback&autostart=1`

### 2) Browser — read the pass on return

```js
const pass = Synk.takePassFromUrl(); // reads ?synk_pass= and strips it from the URL
if (pass) {
  await fetch("/api/session/synk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pass }),
  });
}
```

### 3) Your server — consume the pass with the API key

```http
POST https://synkid.netlify.app/api/synk-pass
Content-Type: application/json
X-Synk-Key: sk_live_...

{ "pass": "skp_...", "singleUse": true }
```

Success payload shape:

```json
{
  "ok": true,
  "product": "synk",
  "app": { "slug": "my-app-slug", "name": "My App" },
  "profile": {
    "id": "...",
    "synkCode": "SK-XXXX-XXXX",
    "name": "Member Name",
    "photoUrl": "https://...",
    "policy": "pending|autofill|auto_admit|auto_deny"
  },
  "pass": { "id": "...", "appSlug": "my-app-slug", "purpose": "identity", "expiresAt": "..." }
}
```

Then create **your** session from `profile.synkCode` / `profile.id`. Never store the Synk API key in frontend code.

## Setup checklist for a new platform

1. Open Synk Business (`/business`) → request access / sign in.
2. Create or pair an **app slug** for the new product (`pair-app`).
3. Copy the `sk_live_…` API key (shown once) into the new app’s **server** env, e.g. `SYNK_API_KEY`.
4. Add a “Continue with Synk” button that calls `Synk.signIn({ app, returnTo })`.
5. Add a server route that consumes `/api/synk-pass` and starts your own session.
6. Optionally set the app’s verify action (identity / autofill / auto-admit) in Business settings.

## Endpoints agents should know

| Method | Path | Auth | Use |
|--------|------|------|-----|
| — | `/verify?app=&return=&intent=` | none | Member verification UI |
| POST | `/api/synk-pass` | `X-Synk-Key` | Consume pass → profile |
| POST | `/api/synk-auth` | none (member verify) | Used by Synk UI; apps usually don’t call this |
| POST | `/api/synk-business` | business session | Pair apps, manage keys |

Base URL for apps: **`https://synkid.netlify.app`** (proxies `/api/*` to the API host).

## Security rules (do not violate)

- `sk_live_…` keys are **server-only**.
- Passes (`skp_…`) are short-lived (~2 minutes) and should be treated as single-use.
- Prefer linking your user record to `synkCode`, not to face data.
- Do not scrape Community or Hub HTML for auth — use passes + API key.

## Drop-in files in this repo

- Browser SDK: `synk-id/src/sdk.js` → published at `/sdk.js`
- Human docs: `https://synkid.netlify.app/docs`
- Example snippets: `integrations/synk/`
- Cursor rule: `.cursor/rules/synk-integration.mdc`

## Naming

Use **Synk** in user-facing copy. Do not mention other identity or community platforms by name in release notes or product UI.
