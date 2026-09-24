# Add Synk to another product

Copy-paste kit for Cursor agents and humans.

## 1. Env (server)

```bash
SYNK_API_KEY=sk_live_...
SYNK_APP_SLUG=my-app
SYNK_ORIGIN=https://synkid.netlify.app
```

## 2. Frontend button

```html
<script src="https://synkid.netlify.app/sdk.js"></script>
<button type="button" id="continue-synk">Continue with Synk</button>
<script>
  document.getElementById("continue-synk").onclick = () => {
    Synk.signIn({
      app: "my-app",
      returnTo: window.location.origin + "/auth/synk/callback",
    });
  };
</script>
```

## 3. Callback page

```html
<script src="https://synkid.netlify.app/sdk.js"></script>
<script>
  (async () => {
    const pass = Synk.takePassFromUrl();
    if (!pass) {
      location.href = "/login?error=missing_pass";
      return;
    }
    const res = await fetch("/api/auth/synk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass }),
    });
    if (!res.ok) {
      location.href = "/login?error=synk_failed";
      return;
    }
    location.href = "/app";
  })();
</script>
```

## 4. Server route

See `server-example.js` for a minimal Netlify/Node handler.

## Flow diagram

```
Your app                  Synk ID                         Your API
   |                        |                                |
   |-- Synk.signIn() ------>| /verify                        |
   |                        | (face / code)                  |
   |<-- redirect ?synk_pass-|                                |
   |-- POST /api/auth/synk --------------------------------->|
   |                        |<-- POST /api/synk-pass + key --|
   |                        |--- profile JSON -------------->|
   |<------------- set your session -------------------------|
```
