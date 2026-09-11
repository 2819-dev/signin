(() => {
  const SESSION_KEY = "synk_support_chat_session";
  const NAME_KEY = "synk_support_chat_name";
  const MEMBER_KEY = "synk_member_session";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayName(value) {
    return String(value || "").replace(/\s*·\s*Synk\s*$/i, "").trim();
  }

  function readMemberName() {
    try {
      const raw = localStorage.getItem(MEMBER_KEY) || sessionStorage.getItem(MEMBER_KEY) || "";
      if (!raw) return "";
      const data = JSON.parse(raw);
      return String((data && data.profile && data.profile.name) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function createEl(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  async function chatEnabled() {
    try {
      const res = await fetch("/api/kiosk-status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return true;
      const settings = data.settings || data;
      return settings.chatEnabled !== false;
    } catch (_) {
      return true;
    }
  }

  function boot() {
    if (document.getElementById("synk-support-root")) return;

    const root = createEl(`
      <div id="synk-support-root" class="synk-support-root">
        <button type="button" class="synk-support-fab" id="synk-support-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="synk-support-panel">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7z"/>
          </svg>
          <span>Support</span>
        </button>
        <div class="synk-support-backdrop" id="synk-support-backdrop" hidden></div>
        <section class="synk-support-panel" id="synk-support-panel" role="dialog" aria-modal="true" aria-labelledby="synk-support-title" hidden>
          <header class="synk-support-head">
            <div>
              <p class="synk-support-eyebrow">Live support</p>
              <h2 id="synk-support-title">Chat with Synk</h2>
            </div>
            <button type="button" class="synk-support-close" id="synk-support-close" aria-label="Close support chat">✕</button>
          </header>
          <div class="synk-support-body">
            <div id="synk-support-name-gate" class="synk-support-gate">
              <p class="muted">Tell us your name and someone will reply here.</p>
              <form id="synk-support-name-form" autocomplete="off">
                <label class="sr-only" for="synk-support-name">Your name</label>
                <input id="synk-support-name" type="text" maxlength="80" required placeholder="Your name" autocomplete="name" />
                <button class="btn btn-primary" type="submit">Start chat</button>
              </form>
              <p class="synk-support-error" id="synk-support-name-error" hidden></p>
            </div>
            <div id="synk-support-chat" class="synk-support-chat" hidden>
              <div id="synk-support-messages" class="synk-support-messages" aria-live="polite"></div>
              <form id="synk-support-form" class="synk-support-composer" autocomplete="off">
                <label class="sr-only" for="synk-support-input">Message</label>
                <input id="synk-support-input" type="text" maxlength="1000" required placeholder="Type a message…" enterkeyhint="send" />
                <button class="btn btn-primary btn-compact" type="submit" id="synk-support-send">Send</button>
              </form>
              <p id="synk-support-closed" class="synk-support-closed" hidden>Chat closed</p>
            </div>
          </div>
        </section>
      </div>
    `);
    document.body.appendChild(root);

    const fab = document.getElementById("synk-support-fab");
    const panel = document.getElementById("synk-support-panel");
    const backdrop = document.getElementById("synk-support-backdrop");
    const closeBtn = document.getElementById("synk-support-close");
    const nameGate = document.getElementById("synk-support-name-gate");
    const nameForm = document.getElementById("synk-support-name-form");
    const nameInput = document.getElementById("synk-support-name");
    const nameError = document.getElementById("synk-support-name-error");
    const chatPane = document.getElementById("synk-support-chat");
    const messagesEl = document.getElementById("synk-support-messages");
    const chatForm = document.getElementById("synk-support-form");
    const chatInput = document.getElementById("synk-support-input");
    const sendBtn = document.getElementById("synk-support-send");
    const closedNote = document.getElementById("synk-support-closed");
    const titleEl = document.getElementById("synk-support-title");

    let sessionId = sessionStorage.getItem(SESSION_KEY) || "";
    let visitorName = sessionStorage.getItem(NAME_KEY) || readMemberName() || "";
    let pollTimer = null;
    let lastKey = "";
    let closed = false;
    let open = false;

    if (visitorName && nameInput) nameInput.value = visitorName;

    function setOpen(next) {
      open = !!next;
      panel.hidden = !open;
      backdrop.hidden = !open;
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("synk-support-open", open);
      if (open) {
        resumeChat().catch(() => {});
        setTimeout(() => {
          if (!chatPane.hidden) chatInput.focus();
          else nameInput.focus();
        }, 40);
      } else {
        stopPoll();
      }
    }

    function showNameGate() {
      nameGate.hidden = false;
      chatPane.hidden = true;
      titleEl.textContent = "Chat with Synk";
    }

    function showChat() {
      nameGate.hidden = true;
      chatPane.hidden = false;
      titleEl.textContent = displayName(visitorName) ? `Hi, ${displayName(visitorName)}` : "Live support";
      chatForm.hidden = closed;
      closedNote.hidden = !closed;
    }

    function stopPoll() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function startPoll() {
      stopPoll();
      pollTimer = setInterval(() => {
        if (open && sessionId) loadSession().catch(() => {});
      }, 2500);
    }

    function renderMessages(messages) {
      const list = Array.isArray(messages) ? messages : [];
      const key = list.map((m) => `${m.id}:${m.body}`).join("|");
      if (key === lastKey) return;
      lastKey = key;
      messagesEl.innerHTML = list
        .map((m) => {
          const sender = String(m.sender || "");
          const cls =
            sender === "visitor" ? "is-mine" :
            sender === "admin" ? "is-theirs" : "is-system";
          return `<div class="synk-support-bubble ${cls}">${escapeHtml(m.body)}</div>`;
        })
        .join("");
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function loadSession() {
      if (!sessionId) return null;
      const res = await fetch(`/api/chat-session?id=${encodeURIComponent(sessionId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sessionId = "";
        sessionStorage.removeItem(SESSION_KEY);
        showNameGate();
        throw new Error(data.error || "Chat unavailable");
      }
      closed = !!(data.session && data.session.status === "closed");
      visitorName = (data.session && data.session.visitorName) || visitorName;
      if (visitorName) sessionStorage.setItem(NAME_KEY, visitorName);
      showChat();
      renderMessages(data.messages || []);
      startPoll();
      return data;
    }

    async function startSession(name) {
      const clean = String(name || "").trim().slice(0, 80);
      if (!clean) throw new Error("Name is required");
      const res = await fetch("/api/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${clean} · Synk` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start chat");
      sessionId = data.session && data.session.id;
      visitorName = (data.session && data.session.visitorName) || clean;
      if (!sessionId) throw new Error("Could not start chat");
      sessionStorage.setItem(SESSION_KEY, sessionId);
      sessionStorage.setItem(NAME_KEY, visitorName);
      lastKey = "";
      closed = false;
      showChat();
      renderMessages(data.messages || []);
      startPoll();
      return data;
    }

    async function resumeChat() {
      if (sessionId) {
        try {
          await loadSession();
          return;
        } catch (_) {
          /* fall through to name gate */
        }
      }
      showNameGate();
    }

    fab.addEventListener("click", () => setOpen(!open));
    closeBtn.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    });

    nameForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      nameError.hidden = true;
      const btn = nameForm.querySelector("button[type='submit']");
      btn.disabled = true;
      try {
        await startSession(nameInput.value);
      } catch (err) {
        nameError.textContent = err.message || "Could not start chat";
        nameError.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });

    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = String(chatInput.value || "").trim();
      if (!body || !sessionId || closed) return;
      sendBtn.disabled = true;
      try {
        const res = await fetch("/api/chat-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, sender: "visitor", body }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not send");
        chatInput.value = "";
        await loadSession();
      } catch (err) {
        closedNote.hidden = false;
        closedNote.textContent = err.message || "Could not send";
      } finally {
        sendBtn.disabled = false;
        chatInput.focus();
      }
    });

    // Always start closed — only the FAB opens the panel.
    setOpen(false);
    chatEnabled().then((enabled) => {
      root.hidden = !enabled;
      if (!enabled) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
