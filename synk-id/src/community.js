(() => {
  const STORAGE_KEY = "synk_member_session";
  const PERSONA_KEY = "synk_community_persona";
  const RECENT_KEY = "synk_community_recent";
  const SORT_KEY = "synk_community_sort";


  const ICO_PATHS = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 7 2.5 7 2.5 7H4s2.5 0 2.5-7"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    home: '<path d="m4 10 8-7 8 7"/><path d="M6 10v10h12V10"/>',
    feed: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    popular: '<path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/>',
    create: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/>',
    exit: '<path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2"/><path d="M15 12H3m0 0 3-3m-3 3 3 3"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    comment: '<path d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7z"/>',
    share: '<path d="M14 7h6v6"/><path d="M20 7 10.5 16.5"/><path d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.5L6 21V5a1 1 0 0 1 1-1z"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
  };

  function ico(name, size = 18) {
    const body = ICO_PATHS[name] || "";
    return `<svg class="r-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function truncateText(text, max = 180) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (value.length <= max) return value;
    return `${value.slice(0, max).trim()}…`;
  }


  const lockedCard = document.getElementById("locked-card");
  const communityApp = document.getElementById("community-app");
  const communityMain = document.getElementById("community-main");
  const composerCard = document.getElementById("composer-card");
  const feedEl = document.getElementById("feed");
  const feedEmpty = document.getElementById("feed-empty");
  const groupList = document.getElementById("group-list");
  const postGroup = document.getElementById("post-group");
  const staffTools = document.getElementById("staff-tools");
  const ownerTools = document.getElementById("owner-tools");
  const staffList = document.getElementById("staff-list");
  const altList = document.getElementById("alt-list");
  const personaSwitch = document.getElementById("persona-switch");
  const personaBtn = document.getElementById("persona-btn");
  const personaMenu = document.getElementById("persona-menu");
  const personaLabel = document.getElementById("persona-label");
  const profileMeta = document.getElementById("profile-meta");
  const crumbsEl = document.getElementById("crumbs");
  const homeLink = document.getElementById("home-link");
  const popularLink = document.getElementById("popular-link");
  const tagCatalog = document.getElementById("tag-catalog");
  const assignTagSelect = document.getElementById("assign-tag-id");
  const myTagsCard = document.getElementById("my-tags-card");
  const myTagsList = document.getElementById("my-tags-list");
  const feedViewEl = document.getElementById("feed-view");
  const submitView = document.getElementById("submit-view");
  const settingsViewEl = document.getElementById("settings-view");
  const modView = document.getElementById("mod-view");
  const postView = document.getElementById("post-view");
  const inboxView = document.getElementById("inbox-view");

  let hubToken = "";
  let publicUsername = "";
  let displayName = "";
  let photoUrl = "";
  let avatarUrl = "";
  let bio = "";
  let dmPolicy = "friends";
  let activeProfile = null;
  let inboxTab = "notifications";
  let dmThreads = [];
  let activeDmUser = "";
  let activeDmThreadId = "";
  let activeDmMessages = [];
  let editingDmMessageId = "";
  let activeDmSheetMessageId = "";
  let dmPressTimer = null;
  let dmPressMoved = false;
  const DM_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];
  let activePersona = "";
  let me = null;
  let groups = [];
  let staff = [];
  let alts = [];
  let ownerUsername = "vision";
  let tags = [];
  let infoPagesCache = [];
  window.__synkInfoPages = [];
  let pendingTagIconData = "";
  let myTags = [];
  let route = { type: "home", slug: "", username: "" };
  let lastPosts = [];
  let lastComments = [];
  let lastNotifications = [];
  let lastSearch = { query: "", posts: [], users: [], groups: [] };
  let currentSort = "new";
  let activePostId = "";
  let unreadCount = 0;
  let activeSubmitType = "text";
  let activeGroupJoined = false;
  let activeChannelSlug = "";
  let activeGroupDetail = null;

  function readSession() {
    try {
      let store = localStorage;
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = sessionStorage.getItem(STORAGE_KEY);
        store = sessionStorage;
      }
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.profile) return null;

      const stay = !!(data.staySignedIn || (data.hubSession && data.hubSession.staySignedIn));
      let expiresAt = Number(data.expiresAt) || 0;
      const hubExp = data.hubSession && data.hubSession.expiresAt
        ? new Date(data.hubSession.expiresAt).getTime()
        : 0;
      if (hubExp && (!expiresAt || hubExp > expiresAt)) expiresAt = hubExp;

      // Repair older sessions that accidentally used the short face-pass TTL.
      if (stay && data.hubSession && data.hubSession.token) {
        const verifiedAt = Number(data.verifiedAt || data.savedAt || 0) || 0;
        const looksShort = !expiresAt || (verifiedAt && expiresAt - verifiedAt < 24 * 60 * 60 * 1000);
        if (looksShort && (!hubExp || hubExp <= Date.now())) {
          expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        } else if (looksShort && hubExp > Date.now()) {
          expiresAt = hubExp;
        }
        data.expiresAt = expiresAt;
        data.staySignedIn = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          if (store !== localStorage) sessionStorage.removeItem(STORAGE_KEY);
          store = localStorage;
        } catch (_) {}
      }

      if (expiresAt && Date.now() > expiresAt) {
        store.removeItem(STORAGE_KEY);
        return null;
      }
      if (!data.hubSession || !data.hubSession.token) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function hubHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Synk-Hub-Session": hubToken,
    };
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }


  function tagInitial(tag) {
    const name = String((tag && tag.name) || "?").trim();
    return name.slice(0, 1).toUpperCase() || "?";
  }

  /** Pin control is only for the username you are currently acting as (tag owner). */
  function canPinTagsFor(username) {
    if (!me || !username) return false;
    const u = String(username || "")
      .trim()
      .toLowerCase();
    if (!u) return false;
    const acting = String(activePersona || me.publicUsername || "")
      .trim()
      .toLowerCase();
    return acting === u;
  }

  function tagsForActivePersona() {
    if (!me) return [];
    if (!activePersona || activePersona === publicUsername) return me.tags || [];
    const alt = (alts || []).find((item) => item.username === activePersona);
    return (alt && alt.tags) || [];
  }

  function isBetaTesterTagClient(tag) {
    if (!tag) return false;
    const slug = String(tag.slug || "").toLowerCase();
    const name = String(tag.name || "").toLowerCase();
    return (
      slug === "beta-tester" ||
      slug === "beta_tester" ||
      slug === "betatester" ||
      slug.includes("beta-tester") ||
      name.includes("beta tester")
    );
  }

  function isCurrentUserBetaTester() {
    if (me && me.betaTester) return true;
    if (tagsForActivePersona().some(isBetaTesterTagClient)) return true;
    if (((me && me.tags) || []).some(isBetaTesterTagClient)) return true;
    return (alts || []).some((alt) => (alt.tags || []).some(isBetaTesterTagClient));
  }



  function activeDisplayLabel() {
    if (activePersona && activePersona !== publicUsername) {
      const alt = (alts || []).find((a) => a.username === activePersona);
      return String((alt && alt.displayName) || activePersona || "").trim() || activePersona;
    }
    return String(displayName || publicUsername || "Member").trim() || "Member";
  }

  function activeCommunityAvatarUrl() {
    if (activePersona && activePersona !== publicUsername) {
      const alt = (alts || []).find((a) => a.username === activePersona);
      return String((alt && alt.avatarUrl) || "").trim();
    }
    return String(avatarUrl || (me && me.avatarUrl) || "").trim();
  }

  function avatarMarkup(url, label, cls = "community-face") {
    const initial = String(label || "?").trim().slice(0, 1).toUpperCase() || "?";
    const safeUrl = String(url || "").trim();
    if (safeUrl) {
      return `<span class="${cls} has-image"><img src="${escapeHtml(safeUrl)}" alt="" loading="lazy" decoding="async" /></span>`;
    }
    return `<span class="${cls}" aria-hidden="true">${escapeHtml(initial)}</span>`;
  }

  function paintAvatar(el, url, label) {
    if (!el) return;
    const initial = String(label || "?").trim().slice(0, 1).toUpperCase() || "?";
    const safeUrl = String(url || "").trim();
    el.classList.add("community-face");
    if (safeUrl) {
      el.classList.add("has-image");
      el.innerHTML = `<img src="${escapeHtml(safeUrl)}" alt="" loading="lazy" decoding="async" />`;
    } else {
      el.classList.remove("has-image");
      el.textContent = initial;
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
  }

  function updateSessionPhotoUrl(nextPhotoUrl) {
    try {
      const session = readSession();
      if (!session || !session.profile) return;
      session.profile.photoUrl = nextPhotoUrl || "";
      const raw = JSON.stringify(session);
      if (localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, raw);
      else sessionStorage.setItem(STORAGE_KEY, raw);
    } catch (_) {}
  }

  function authorLabel(author) {
    const username = String((author && author.username) || "member").trim() || "member";
    const label = String((author && author.displayName) || "").trim() || username;
    return { username, label };
  }

  function renderAuthorLink(author, { compactTag = true, withAvatar = false } = {}) {
    const { username, label } = authorLabel(author);
    const tag = author && author.pinnedTag ? tagChip(author.pinnedTag, { compact: compactTag }) : "";
    const avatar = withAvatar ? avatarMarkup(author && author.avatarUrl, label, "community-face is-inline") : "";
    return `<span class="author-with-tag">${avatar}<a class="community-user-link" href="/user/${escapeHtml(username)}">${escapeHtml(label)}</a>${tag}</span>`;
  }

  function tagChip(tag, { compact = false, canPin = false } = {}) {
    if (!tag) return "";
    const color = escapeHtml(tag.color || "#6366f1");
    const name = escapeHtml(tag.name || "Tag");
    const desc = escapeHtml(tag.description || "");
    const id = escapeHtml(String(tag.id || ""));
    const pinned = tag.pinned ? "1" : "0";
    const initial = escapeHtml(tagInitial(tag));
    const iconUrl = escapeHtml(tag.iconUrl || "");
    const cls = [
      "synk-tag-badge",
      compact ? "is-compact" : "",
      tag.pinned ? "is-pinned" : "",
      iconUrl ? "has-icon" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const inner = iconUrl
      ? `<img class="synk-tag-badge-img" src="${iconUrl}" alt="" loading="lazy" />`
      : `<span class="synk-tag-badge-icon" aria-hidden="true">${initial}</span>`;
    const learn = tag.learnMoreEnabled && (tag.learnMorePageSlug || tag.learnMorePageId) ? "1" : "0";
    const learnSlug = escapeHtml(tag.learnMorePageSlug || "");
    const learnId = escapeHtml(String(tag.learnMorePageId || ""));
    return `<button type="button" class="${cls}" style="--tag-color:${color}" data-tag-badge="1" data-tag-id="${id}" data-tag-name="${name}" data-tag-desc="${desc}" data-tag-pinned="${pinned}" data-tag-icon="${iconUrl}" data-tag-learn="${learn}" data-tag-learn-slug="${learnSlug}" data-tag-learn-id="${learnId}" data-can-pin="${canPin ? "1" : "0"}" aria-label="${name}" aria-expanded="false" title="${name}">${inner}</button>`;
  }
  function ensureTagPopover() {
    let pop = document.getElementById("tag-badge-popover");
    if (pop) return pop;
    pop = document.createElement("div");
    pop.id = "tag-badge-popover";
    pop.className = "synk-tag-popover";
    pop.hidden = true;
    pop.innerHTML = `
      <div class="synk-tag-popover-head">
        <span class="synk-tag-popover-icon" id="tag-pop-icon" aria-hidden="true"></span>
        <strong class="synk-tag-popover-name" id="tag-pop-name"></strong>
      </div>
      <p class="synk-tag-popover-desc" id="tag-pop-desc"></p>
      <a class="synk-tag-popover-learn" id="tag-pop-learn" hidden href="#">Learn more</a>
      <button type="button" class="btn btn-secondary btn-compact synk-tag-popover-pin" id="tag-pop-pin" hidden>Pin next to name</button>
    `;
    document.body.appendChild(pop);
    return pop;
  }

  function closeTagPopover() {
    const pop = document.getElementById("tag-badge-popover");
    if (pop) pop.hidden = true;
    document.querySelectorAll(".synk-tag-badge[aria-expanded='true']").forEach((el) => {
      el.setAttribute("aria-expanded", "false");
    });
  }

  function openTagPopover(btn) {
    if (!btn) return;
    const pop = ensureTagPopover();
    const name = btn.getAttribute("data-tag-name") || "Tag";
    const desc = btn.getAttribute("data-tag-desc") || "No description.";
    const color = btn.style.getPropertyValue("--tag-color") || "#6366f1";
    const canPin = btn.getAttribute("data-can-pin") === "1";
    const pinned = btn.getAttribute("data-tag-pinned") === "1";
    const tagId = btn.getAttribute("data-tag-id") || "";
    const icon = pop.querySelector("#tag-pop-icon");
    const nameEl = pop.querySelector("#tag-pop-name");
    const descEl = pop.querySelector("#tag-pop-desc");
    const pinBtn = pop.querySelector("#tag-pop-pin");
    const learnLink = pop.querySelector("#tag-pop-learn");
    if (learnLink) {
      const learnOn = btn.getAttribute("data-tag-learn") === "1";
      const slug = btn.getAttribute("data-tag-learn-slug") || "";
      const pageId = btn.getAttribute("data-tag-learn-id") || "";
      if (learnOn && (slug || pageId)) {
        learnLink.hidden = false;
        learnLink.removeAttribute("aria-hidden");
        learnLink.textContent = "Learn more";
        learnLink.href = slug ? `/info/${encodeURIComponent(slug)}` : `/info/?id=${encodeURIComponent(pageId)}`;
      } else {
        learnLink.hidden = true;
        learnLink.setAttribute("aria-hidden", "true");
        learnLink.textContent = "";
        learnLink.removeAttribute("href");
      }
    }
    if (icon) {
      const iconUrl = btn.getAttribute("data-tag-icon") || "";
      icon.style.setProperty("--tag-color", color);
      if (iconUrl) {
        icon.classList.add("has-image");
        icon.innerHTML = `<img src="${iconUrl.replace(/"/g, "&quot;")}" alt="" />`;
      } else {
        icon.classList.remove("has-image");
        icon.textContent = (name || "?").slice(0, 1).toUpperCase();
      }
    }
    if (nameEl) nameEl.textContent = name;
    if (descEl) descEl.textContent = desc || "No description.";
    if (pinBtn) {
      // Owner-only: never show Pin/Unpin to anyone else (also enforced in CSS).
      pinBtn.hidden = !canPin;
      if (!canPin) {
        pinBtn.removeAttribute("data-pin-tag");
        pinBtn.removeAttribute("data-tag-pinned");
        pinBtn.textContent = "Pin next to name";
        pinBtn.classList.remove("btn-primary");
        pinBtn.classList.add("btn-secondary");
      } else {
        pinBtn.textContent = pinned ? "Unpin from name" : "Pin next to name";
        pinBtn.classList.toggle("btn-primary", pinned);
        pinBtn.classList.toggle("btn-secondary", !pinned);
        pinBtn.setAttribute("data-pin-tag", tagId);
        pinBtn.setAttribute("data-tag-pinned", pinned ? "1" : "0");
      }
    }
    document.querySelectorAll(".synk-tag-badge[aria-expanded='true']").forEach((el) => {
      if (el !== btn) el.setAttribute("aria-expanded", "false");
    });
    btn.setAttribute("aria-expanded", "true");
    pop.hidden = false;
    const rect = btn.getBoundingClientRect();
    const pad = 8;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    // Keep on screen after paint
    requestAnimationFrame(() => {
      const pr = pop.getBoundingClientRect();
      if (pr.right > window.innerWidth - pad) {
        left = Math.max(pad, window.scrollX + window.innerWidth - pr.width - pad);
        pop.style.left = `${left}px`;
      }
      if (pr.bottom > window.innerHeight - pad) {
        top = rect.top + window.scrollY - pr.height - 6;
        pop.style.top = `${Math.max(pad, top)}px`;
      }
    });
  }

  function renderTagCatalog() {
    if (!tagCatalog) return;
    if (!tags.length) {
      tagCatalog.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No tags yet.</p>';
    } else {
      tagCatalog.innerHTML = tags
        .map((tag) => {
          const id = escapeHtml(tag.id);
          return `
            <div class="community-staff-row synk-tag-mod-item" data-tag-mod-id="${id}">
              <div class="synk-tag-mod-row">
                ${tagChip(tag)}
                <div>
                  <strong>${escapeHtml(tag.name || "")}</strong>
                  <div class="muted" style="font-size:0.78rem;margin-top:2px;">${escapeHtml(tag.description || "No description")}</div>
                </div>
              </div>
              <div class="synk-tag-mod-actions">
                <button class="btn btn-secondary btn-compact" type="button" data-edit-tag="${id}" aria-expanded="false">Edit</button>
                <div class="synk-tag-mod-edit-panel" hidden>
                  <button class="btn btn-secondary btn-compact" type="button" data-upload-tag-icon="${id}">Icon</button>
                  ${tag.iconUrl ? `<button class="btn btn-secondary btn-compact" type="button" data-clear-tag-icon="${id}">Clear icon</button>` : ""}
                  <div class="mod-learn-more-box">
                    <label class="check-row">
                      <input type="checkbox" data-tag-learn-enabled="${id}" ${tag.learnMoreEnabled ? "checked" : ""} />
                      <span>Enable Learn more</span>
                    </label>
                    <select data-tag-learn-page="${id}">
                      <option value="">Select page…</option>
                      ${(window.__synkInfoPages || []).map((p) => `<option value="${escapeHtml(p.id)}" ${String(tag.learnMorePageId || "") === String(p.id) ? "selected" : ""}>${escapeHtml(p.title)}</option>`).join("")}
                    </select>
                    <button class="btn btn-secondary btn-compact" type="button" data-save-tag-learn="${id}">Save Learn more</button>
                  </div>
                  <button class="btn btn-secondary btn-compact" type="button" data-delete-tag="${id}">Delete</button>
                  <button class="btn btn-secondary btn-compact" type="button" data-edit-tag-done="${id}">Done</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
    if (assignTagSelect) {
      assignTagSelect.innerHTML = tags.length
        ? tags.map((tag) => `<option value="${escapeHtml(tag.id)}">${escapeHtml(tag.name)}</option>`).join("")
        : '<option value="">No tags yet</option>';
    }
  }

  function renderMyTags() {
    if (!myTagsCard || !myTagsList) return;
    myTags = tagsForActivePersona();
    if (!myTags.length) {
      myTagsCard.hidden = true;
      myTagsList.innerHTML = "";
      return;
    }
    myTagsCard.hidden = route.type !== "settings";
    myTagsList.innerHTML = `
      <div class="synk-tag-badge-row">
        ${myTags.map((tag) => tagChip(tag, { canPin: true })).join("")}
      </div>
      <p class="muted" style="margin:8px 0 0;font-size:0.82rem;">Tap a badge for details. Only you can pin one next to your name.</p>
    `;
  }

  // Public flair is tags only — no automatic Owner badge on posts/profiles.
  function roleBadge(role, { staffOnly = false } = {}) {
    if (!staffOnly) return "";
    if (role === "admin") return '<span class="community-badge community-badge-admin">Admin</span>';
    return "";
  }

  function formatRelative(iso) {
    try {
      const then = new Date(iso).getTime();
      if (!Number.isFinite(then)) return "";
      const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
      if (sec < 60) return `${sec || 1}s ago`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const day = Math.floor(hr / 24);
      if (day < 30) return `${day}d ago`;
      return formatWhen(iso);
    } catch (_) {
      return "";
    }
  }

  
  function readRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((x) => x && x.slug).slice(0, 8) : [];
    } catch (_) {
      return [];
    }
  }

  function pushRecent(group) {
    if (!group || !group.slug) return;
    const next = [{ slug: group.slug, name: group.name || group.slug }, ...readRecent().filter((g) => g.slug !== group.slug)].slice(0, 8);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (_) {}
    renderRecent();
  }

  function renderRecent() {
    const el = document.getElementById("recent-list");
    if (!el) return;
    const recent = readRecent();
    if (!recent.length) {
      el.innerHTML = '<p class="muted reddit-nav-empty">Communities you visit show up here.</p>';
      return;
    }
    el.innerHTML = recent.map((g) => {
      const active = route.type === "group" && route.slug === g.slug ? "is-active" : "";
      const initial = String(g.slug || "?").slice(0, 1).toUpperCase();
      return `<a class="reddit-nav-item community-group-link ${active}" href="/community/group/${escapeHtml(g.slug)}" data-group="${escapeHtml(g.slug)}"><span class="reddit-nav-avatar" aria-hidden="true">${escapeHtml(initial)}</span><span>${escapeHtml(g.slug)}</span></a>`;
    }).join("");
  }

  function postScore(post) {
    const created = new Date(post.createdAt || 0).getTime() || Date.now();
    const ageHours = Math.max(1, (Date.now() - created) / 3600000);
    const activity = Number((post.group && post.group.postCount) || 1);
    return activity / Math.pow(ageHours + 2, 1.2);
  }


  function splitPost(body) {
    const text = String(body || "").trim();
    const lines = text.split(/\n/);
    const title = (lines[0] || "Post").slice(0, 180);
    const rest = lines.slice(1).join("\n").trim();
    const bodyText = rest || (text.length > 180 ? text.slice(180).trim() : "");
    return { title, bodyText };
  }

  function postTitle(post) {
    const titled = String((post && post.title) || "").trim();
    if (titled) return titled;
    return splitPost(post && post.body).title;
  }

  function postBodyText(post) {
    const titled = String((post && post.title) || "").trim();
    const body = String((post && post.body) || "").trim();
    if (titled) return body;
    return splitPost(body).bodyText;
  }

  function displayScore(post) {
    if (post && post.score != null && Number.isFinite(Number(post.score))) {
      return Number(post.score);
    }
    return 0;
  }

  function sortedPosts(posts) {
    const list = Array.isArray(posts) ? posts.slice() : [];
    const sort = route.type === "popular" ? "hot" : currentSort || "new";
    if (sort === "top" || sort === "hot" || sort === "best") {
      list.sort((a, b) => displayScore(b) - displayScore(a) || postScore(b) - postScore(a));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return list;
  }

  function updateInboxBadge() {
    const n = Number(unreadCount) || 0;
    const label = n > 99 ? "99+" : String(n);
    ["inbox-badge", "notifications-badge", "tab-inbox-badge"].forEach((id) => {
      const badge = document.getElementById(id);
      if (!badge) return;
      if (n > 0) {
        badge.hidden = false;
        badge.textContent = label;
      } else {
        badge.hidden = true;
        badge.textContent = "0";
      }
    });
    const avatarDot = document.getElementById("avatar-notif-dot");
    if (avatarDot) avatarDot.hidden = n <= 0;
    const notifDot = document.getElementById("notif-dot");
    if (notifDot) notifDot.hidden = n <= 0;
    const notifWrap = document.getElementById("notif-wrap");
    if (notifWrap) notifWrap.classList.toggle("has-unread", n > 0);
  }

  function apiSort() {
    const sort = route.type === "popular" ? "hot" : currentSort || "new";
    if (sort === "best") return "hot";
    if (sort === "hot" || sort === "top" || sort === "new") return sort;
    return "new";
  }

  function showToast(message) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "community-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = String(message || "");
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  async function communityAction(payload) {
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: hubHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function findPost(id) {
    return (lastPosts || []).find((p) => String(p.id) === String(id)) || null;
  }

  function patchPost(id, patch) {
    lastPosts = (lastPosts || []).map((p) =>
      String(p.id) === String(id) ? { ...p, ...patch } : p
    );
    return findPost(id);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image file"));
      reader.readAsDataURL(file);
    });
  }

  function renderPostMedia(post, { large = false } = {}) {
    const type = String((post && post.type) || "text").toLowerCase();
    if (type === "link" && post.linkUrl) {
      const href = escapeHtml(post.linkUrl);
      return `<a class="reddit-post-link" href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`;
    }
    if (type === "image" && post.imageUrl) {
      const src = escapeHtml(post.imageUrl);
      return `<div class="reddit-post-image${large ? " is-lg" : ""}"><img src="${src}" alt="" loading="lazy" /></div>`;
    }
    if (type === "poll" && Array.isArray(post.pollOptions) && post.pollOptions.length) {
      const counts = Array.isArray(post.pollCounts) ? post.pollCounts : post.pollOptions.map(() => 0);
      const total = counts.reduce((sum, n) => sum + (Number(n) || 0), 0) || 0;
      const pid = escapeHtml(String(post.id || ""));
      const options = post.pollOptions
        .map((label, index) => {
          const count = Number(counts[index]) || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = post.myPollVote === index ? "is-selected" : "";
          return `
            <button class="reddit-poll-option ${selected}" type="button" data-poll-vote="${pid}" data-option-index="${index}">
              <span class="reddit-poll-label">${escapeHtml(label)}</span>
              <span class="reddit-poll-meta">${count} · ${pct}%</span>
            </button>
          `;
        })
        .join("");
      return `<div class="reddit-poll" data-post-id="${pid}">${options}</div>`;
    }
    return "";
  }

  function syncSortTabs() {
    const sort = route.type === "popular" ? "hot" : currentSort || "new";
    const sortHost = document.getElementById("sort-tabs");
    const nodes = sortHost
      ? sortHost.querySelectorAll(".reddit-sort-tab[data-sort]")
      : document.querySelectorAll(".reddit-sort-tab[data-sort]");
    nodes.forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-sort") === sort);
    });
  }

  function syncSearchTabs() {
    const host = document.getElementById("search-tabs");
    if (!host) return;
    const onSearch = route.type === "search";
    host.hidden = !onSearch;
    const tab = onSearch ? String(route.tab || "all") : "all";
    host.querySelectorAll("[data-search-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-search-tab") === tab);
    });
    const sortHost = document.getElementById("sort-tabs");
    if (sortHost) sortHost.hidden = onSearch && tab !== "all" && tab !== "popular";
  }

  function closeUserMenu() {
    const dd = document.getElementById("user-menu-dropdown");
    const btn = document.getElementById("user-menu-btn");
    if (dd) dd.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function setComposerOpen(open) {
    if (open) {
      const groupSlug = route.type === "group" ? route.slug : "";
      const channelSlug = route.type === "group" ? (route.channel || activeChannelSlug || "") : "";
      navigate({ type: "submit", slug: "", username: "" }).then(() => {
        if (groupSlug) {
          history.replaceState(route, "", submitUrlForGroup(groupSlug, channelSlug));
          if (postGroup && groupSlug) postGroup.value = groupSlug;
        }
      }).catch(() => {});
      return;
    }
    const collapsed = document.getElementById("composer-collapsed");
    if (collapsed) collapsed.hidden = false;
  }

  function updateAboutRail(data) {
    const aboutTitle = document.getElementById("about-title");
    const aboutBlurb = document.getElementById("about-blurb");
    const statPosts = document.getElementById("stat-posts");
    const statGroups = document.getElementById("stat-groups");
    const statPostsLabel = document.getElementById("stat-posts-label");
    const rightRail = document.getElementById("right-rail");
    const posts = (data && data.posts) || [];
    if (rightRail) {
      // Desktop-only chrome. Mobile/tablet CSS also forces this off.
      const hideRail =
        route.type === "settings" ||
        route.type === "submit" ||
        route.type === "mod" ||
        route.type === "post" ||
        route.type === "inbox" ||
        route.type === "groups" ||
        route.type === "user" ||
        route.type === "search" ||
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 1100px)").matches);
      rightRail.hidden = hideRail;
      rightRail.classList.toggle("is-hidden", hideRail);
    }
    const aboutMeta = document.getElementById("about-meta");
    if (aboutMeta) aboutMeta.hidden = true;
    const modsList = document.getElementById("mods-list");
    if (modsList) {
      const mods = (staff || []).filter((p) => p.role === "owner" || p.role === "admin");
      modsList.innerHTML = mods.length
        ? mods.map((p) => `<a class="reddit-mod-link" href="/user/${escapeHtml(p.username || "")}">${escapeHtml(p.username || "mod")}</a>`).join("")
        : '<p class="muted">No moderators listed.</p>';
    }
    if (statGroups) statGroups.textContent = String(groups.length);
    if (route.type === "user") {
      const profile = (data && data.profile) || {};
      const uname = profile.username || route.username || "";
      const dname = String(profile.displayName || "").trim() || uname;
      if (aboutTitle) aboutTitle.textContent = dname || "Profile";
      if (aboutBlurb) aboutBlurb.textContent = String(profile.bio || "").trim() || "Member profile";
      if (statPostsLabel) statPostsLabel.textContent = "Posts";
      if (statPosts) statPosts.textContent = String(profile.postCount != null ? profile.postCount : posts.length);
      const aboutJoin = document.getElementById("about-join-btn");
      if (aboutJoin) aboutJoin.hidden = true;
      return;
    }
    if (route.type === "group") {
      const group = (data && data.group) || groups.find((g) => g.slug === route.slug) || null;
      if (aboutTitle) aboutTitle.textContent = group ? `About ${group.slug}` : "About community";
      if (aboutBlurb) aboutBlurb.textContent = (group && group.description) || "A community group.";
      if (statPostsLabel) statPostsLabel.textContent = "Posts";
      if (statPosts) statPosts.textContent = String(group && group.postCount != null ? group.postCount : posts.length);
      return;
    }
    if (route.type === "popular") {
      if (aboutTitle) aboutTitle.textContent = "Popular";
      if (aboutBlurb) aboutBlurb.textContent = "Trending posts across communities.";
      if (statPostsLabel) statPostsLabel.textContent = "Visible posts";
      if (statPosts) statPosts.textContent = String(posts.length);
      return;
    }
    if (route.type === "search") {
      const q = route.query || "";
      if (aboutTitle) aboutTitle.textContent = q ? `Search: ${q}` : "Search";
      if (aboutBlurb) aboutBlurb.textContent = "Posts, groups, and people matching your query.";
      if (statPostsLabel) statPostsLabel.textContent = "Results";
      if (statPosts) {
        const n = (lastSearch.posts || []).length + (lastSearch.users || []).length + (lastSearch.groups || []).length;
        statPosts.textContent = String(n);
      }
      return;
    }
    if (route.type === "groups") {
      if (aboutTitle) aboutTitle.textContent = "Your groups";
      if (aboutBlurb) aboutBlurb.textContent = "Communities you can browse and join.";
      return;
    }
    if (aboutTitle) aboutTitle.textContent = "Feed";
    if (aboutBlurb) aboutBlurb.textContent = "Your community feed across all groups.";
    if (statPostsLabel) statPostsLabel.textContent = "Visible posts";
    if (statPosts) statPosts.textContent = String(posts.length);
  }

  function parseRoute() {
    const path = (location.pathname || "/community").replace(/\/+$/, "") || "/community";
    if (path === "/community/settings") return { type: "settings", slug: "", username: "" };
    if (path === "/community/submit") return { type: "submit", slug: "", username: "" };
    if (path === "/community/mod" || path === "/community/mod-tools") return { type: "mod", slug: "", username: "" };
    if (path === "/community/popular") return { type: "popular", slug: "", username: "" };
    if (path === "/community/inbox") return { type: "inbox", slug: "", username: "" };
    if (path === "/community/groups") return { type: "groups", slug: "", username: "" };
    if (path === "/community/search") {
      const params = new URLSearchParams(location.search || "");
      const query = String(params.get("q") || params.get("query") || params.get("search") || "").trim();
      const tabRaw = String(params.get("tab") || "all").trim().toLowerCase();
      const tab = ["all", "popular", "groups", "users"].includes(tabRaw) ? tabRaw : "all";
      return { type: "search", slug: "", username: "", query, tab };
    }
    let m = path.match(/^\/community\/post\/([a-z0-9_-]+)$/i);
    if (m) return { type: "post", slug: "", username: "", postId: m[1] };
    m = path.match(/^\/community\/(?:group|g)\/([a-z0-9-]+)$/i);
    if (m) {
      const params = new URLSearchParams(location.search || "");
      return {
        type: "group",
        slug: m[1].toLowerCase(),
        username: "",
        channel: String(params.get("channel") || "").trim().toLowerCase(),
      };
    }
    m = path.match(/^\/user\/([a-z0-9_]+)$/i);
    if (m) return { type: "user", slug: "", username: m[1].toLowerCase() };
    m = path.match(/^\/(?:community\/)?u\/([a-z0-9_]+)$/i);
    if (m) return { type: "user", slug: "", username: m[1].toLowerCase() };
    return { type: "home", slug: "", username: "" };
  }

  function routeUrl(next) {
    if (next.type === "settings") return "/community/settings";
    if (next.type === "submit") return "/community/submit";
    if (next.type === "mod") return "/community/mod";
    if (next.type === "popular") return "/community/popular";
    if (next.type === "inbox") return "/community/inbox";
    if (next.type === "groups") return "/community/groups";
    if (next.type === "search") {
      const params = new URLSearchParams();
      if (next.query) params.set("q", next.query);
      if (next.tab && next.tab !== "all") params.set("tab", next.tab);
      const qs = params.toString();
      return qs ? `/community/search?${qs}` : "/community/search";
    }
    if (next.type === "post" && next.postId) return `/community/post/${encodeURIComponent(next.postId)}`;
    if (next.type === "group" && next.slug) {
      const base = `/community/group/${encodeURIComponent(next.slug)}`;
      return next.channel ? `${base}?channel=${encodeURIComponent(next.channel)}` : base;
    }
    if (next.type === "user" && next.username) return `/user/${encodeURIComponent(next.username)}`;
    return "/community";
  }

  async function navigate(next, { replace = false } = {}) {
    try { setNavOpen(false); } catch (_) {}
    try { setNotifOpen(false); } catch (_) {}
    route = next;
    const url = routeUrl(next);
    if (replace) history.replaceState(next, "", url);
    else history.pushState(next, "", url);

    // Swap chrome instantly for settings / create / mod / groups when we already
    // have a session — don't block the UI on a full community reload.
    const light =
      next.type === "settings" ||
      next.type === "submit" ||
      next.type === "mod" ||
      next.type === "groups" ||
      next.type === "inbox";
    if (light && me && publicUsername) {
      try {
        applyUsernameState();
        applyViewState({
          me,
          groups,
          tags,
          staff,
          ownerUsername,
        });
      } catch (_) {}
      loadCommunity({ soft: true }).catch(() => {});
      return;
    }

    await loadCommunity();
  }

  function readStoredPersona() {
    try {
      return String(
        localStorage.getItem(PERSONA_KEY) || sessionStorage.getItem(PERSONA_KEY) || ""
      )
        .trim()
        .toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function storePersona(username) {
    activePersona = String(username || "").trim().toLowerCase();
    try {
      localStorage.setItem(PERSONA_KEY, activePersona);
      sessionStorage.setItem(PERSONA_KEY, activePersona);
    } catch (_) {}
    syncPersonaUi();
    syncTabBar();
  }

  function personaOptions() {
    const options = [];
    if (publicUsername) {
      options.push({
        username: publicUsername,
        label: "Primary",
        isAlt: false,
        displayName: displayName || "",
        avatarUrl: avatarUrl || "",
      });
    }
    (alts || []).forEach((alt) => {
      options.push({
        username: alt.username,
        label: alt.label || "Alt",
        isAlt: true,
        displayName: alt.displayName || "",
        avatarUrl: alt.avatarUrl || "",
      });
    });
    return options;
  }

  function resolveActivePersona() {
    const options = personaOptions();
    if (!options.length) {
      activePersona = "";
      return;
    }
    const wanted = activePersona || readStoredPersona();
    if (wanted && options.some((o) => o.username === wanted)) {
      activePersona = wanted;
      return;
    }
    activePersona = options[0].username;
  }

  function closePersonaMenu() {
    if (!personaMenu || !personaBtn) return;
    personaMenu.hidden = true;
    personaBtn.setAttribute("aria-expanded", "false");
  }

  function syncPersonaUi() {
    const isOwner = !!(me && me.isOwner);
    const options = personaOptions();
    if (personaSwitch) personaSwitch.hidden = !(isOwner && publicUsername && options.length > 1);
    closePersonaMenu();
    resolveActivePersona();
    const label = activeDisplayLabel();
    const faceUrl = activeCommunityAvatarUrl();
    if (personaLabel) personaLabel.textContent = activePersona || publicUsername || "—";
    paintAvatar(document.getElementById("persona-avatar"), faceUrl, label);
    paintAvatar(document.getElementById("composer-avatar"), faceUrl, label);
    const composerAs = document.getElementById("composer-as");
    if (composerAs) {
      composerAs.textContent = activePersona
        ? `Posting as ${activePersona}`
        : publicUsername
          ? `Posting as ${publicUsername}`
          : "Posting as —";
    }
    if (activePersona && me) {
      myTags = tagsForActivePersona();
      if (typeof renderMyTags === "function") renderMyTags();
    }
    const menuProfileLink = document.getElementById("menu-profile-link");
    if (menuProfileLink && (activePersona || publicUsername)) {
      menuProfileLink.href = `/user/${encodeURIComponent(activePersona || publicUsername)}`;
      menuProfileLink.hidden = false;
    }
    if (!isOwner || !personaMenu) return;
    personaMenu.innerHTML = options
      .map((opt) => {
        const selected = opt.username === activePersona ? "is-selected" : "";
        const optLabel = String(opt.displayName || opt.username || "?").trim();
        const optAvatar = String(opt.avatarUrl || "").trim();
        return `
          <button class="persona-menu-item ${selected}" type="button" role="option" data-persona="${escapeHtml(opt.username)}">
            ${avatarMarkup(optAvatar, optLabel, "persona-menu-avatar community-face")}
            <span class="persona-menu-copy">
              <strong>${escapeHtml(optLabel)}</strong>
              <span>${escapeHtml(opt.label || (opt.isAlt ? opt.username : "Primary"))}</span>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderCrumbs() {
    if (!crumbsEl) return;
    // Reddit home/popular have no breadcrumb chrome; keep optional crumbs hidden on feed.
    if (route.type === "home" || route.type === "popular" || route.type === "group" || route.type === "user") {
      crumbsEl.hidden = true;
      crumbsEl.innerHTML = "";
      return;
    }
    const parts = ['<a href="/community">community</a>'];
    if (route.type === "settings") {
      parts.push(`<span>/</span><span>settings</span>`);
    } else if (route.type === "submit") {
      parts.push(`<span>/</span><span>submit</span>`);
    } else if (route.type === "mod") {
      parts.push(`<span>/</span><span>mod</span>`);
    } else if (route.type === "inbox") {
      parts.push(`<span>/</span><span>inbox</span>`);
    }
    crumbsEl.innerHTML = parts.join(" ");
    crumbsEl.hidden = true;
  }


  function restoreJoinButton() {
    const actionsHost = document.querySelector("#view-banner .reddit-community-actions");
    if (!actionsHost) return;
    if (actionsHost.querySelector("#join-community-btn")) return;
    actionsHost.innerHTML = `<button class="btn btn-primary btn-compact reddit-join-btn" type="button" id="join-community-btn" hidden>Join</button>`;
  }

  function setBannerMode(mode, visible) {
    const banner = document.getElementById("view-banner");
    if (!banner) return null;
    banner.dataset.mode = mode || "";
    banner.hidden = !visible;
    const strip = document.getElementById("view-banner-strip");
    if (strip) {
      // Blue banner strip is for communities only — never on user profiles.
      const showStrip = visible && mode === "group";
      strip.hidden = !showStrip;
      strip.setAttribute("aria-hidden", showStrip ? "false" : "true");
    }
    return banner;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  
  function renderGroupsPage() {
    const host = document.getElementById("feed") || document.getElementById("feed-list") || document.getElementById("posts-list");
    if (!host) return;
    if (!groups.length) {
      host.innerHTML = `<article class="card"><p class="muted" style="margin:0;">No groups yet.</p></article>`;
      return;
    }
    host.innerHTML = groups.map((group) => {
      const count = group.postCount != null ? `${group.postCount} post${Number(group.postCount) === 1 ? "" : "s"}` : "";
      const initial = String(group.slug || "?").slice(0, 1).toUpperCase();
      return `<a class="card community-group-card" href="/community/group/${escapeHtml(group.slug)}" data-group="${escapeHtml(group.slug)}" style="display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;text-decoration:none;color:inherit;">
        <span class="reddit-nav-avatar" aria-hidden="true" style="width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-weight:700;">${escapeHtml(initial)}</span>
        <span>
          <strong style="display:block;">${escapeHtml(group.name || group.slug)}</strong>
          <span class="muted" style="font-size:0.85rem;">${escapeHtml(group.slug)}${count ? ` · ${escapeHtml(count)}` : ""}</span>
        </span>
      </a>`;
    }).join("");
  }

  function renderGroups() {
    groupList.innerHTML = groups
      .map((group) => {
        const count = group.postCount != null ? `${group.postCount}` : "";
        const active = route.type === "group" && route.slug === group.slug ? "is-active" : "";
        const initial = String(group.slug || "?").slice(0, 1).toUpperCase();
        return `
          <a class="reddit-nav-item community-group-link ${active}" href="/community/group/${escapeHtml(group.slug)}" data-group="${escapeHtml(group.slug)}">
            <span class="reddit-nav-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
            <span class="reddit-nav-copy">
              <strong>${escapeHtml(group.slug)}${group.isOfficial || group.slug === "synk" ? " ★" : ""}</strong>
              <span>${escapeHtml(group.name)}${count ? ` · ${escapeHtml(count)}` : ""}</span>
            </span>
          </a>
        `;
      })
      .join("");
    if (homeLink) homeLink.classList.toggle("is-active", route.type === "home");
    if (popularLink) popularLink.classList.toggle("is-active", route.type === "popular");
    renderRecent();
    postGroup.innerHTML = groups
      .map((group) => `<option value="${escapeHtml(group.slug)}">${escapeHtml(group.slug)} — ${escapeHtml(group.name)}</option>`)
      .join("");
    const params = new URLSearchParams(location.search);
    const pref = params.get("group") || (route.type === "group" ? route.slug : "");
    if (pref && groups.some((g) => g.slug === pref)) postGroup.value = pref;
    else if (route.type === "group" && route.slug) postGroup.value = route.slug;
    else if (!postGroup.value && groups[0]) postGroup.value = groups[0].slug;
  }

  function renderStaff() {
    if (!staff.length) {
      staffList.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No admins yet.</p>';
      return;
    }
    staffList.innerHTML = staff
      .map((person) => {
        const canRemove = me && me.isOwner && person.role === "admin";
        return `
          <div class="community-staff-row">
            <div>
              <a class="community-user-link" href="/user/${escapeHtml(person.username || "")}">${escapeHtml(person.username || "member")}</a>
              ${roleBadge(person.role, { staffOnly: true })}
            </div>
            ${
              canRemove
                ? `<button class="btn btn-secondary btn-compact" type="button" data-remove-admin="${escapeHtml(person.username)}">Remove</button>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  function renderAlts() {
    if (!alts.length) {
      altList.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No alts yet.</p>';
      return;
    }
    altList.innerHTML = alts
      .map(
        (alt) => `
          <div class="community-staff-row">
            <div>
              <a class="community-user-link" href="/user/${escapeHtml(alt.username)}">${escapeHtml(alt.username)}</a>
              <span class="muted" style="font-size:0.78rem;">${escapeHtml(alt.label || "Alt")}</span>
            </div>
            <button class="btn btn-secondary btn-compact" type="button" data-delete-alt="${escapeHtml(alt.username)}">Delete</button>
          </div>
        `
      )
      .join("");
  }

  function searchHitCard({ href, avatarUrl, label, title, subtitle, isGroup = false }) {
    const initial = String(label || title || "?").trim().slice(0, 1).toUpperCase() || "?";
    const avatar = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" />`
      : escapeHtml(initial);
    return `<a class="search-hit-card" href="${escapeHtml(href)}">
      <span class="search-hit-avatar${isGroup ? " is-group" : ""}" aria-hidden="true">${avatar}</span>
      <span class="search-hit-copy">
        <strong>${escapeHtml(title || label || "")}</strong>
        <span>${escapeHtml(subtitle || "")}</span>
      </span>
    </a>`;
  }

  function renderSearchResults(data = {}) {
    const query = String((data.search && data.search.query) || route.query || "").trim();
    const tab = String(route.tab || "all").toLowerCase();
    lastSearch = {
      query,
      posts: Array.isArray(data.posts) ? data.posts.slice() : lastSearch.posts || [],
      users: Array.isArray(data.users) ? data.users.slice() : lastSearch.users || [],
      groups: Array.isArray(data.matchedGroups)
        ? data.matchedGroups.slice()
        : Array.isArray(data.searchGroups)
          ? data.searchGroups.slice()
          : lastSearch.groups || [],
    };
    if (Array.isArray(data.posts)) lastPosts = data.posts.slice();

    const users = lastSearch.users || [];
    const matchedGroups = lastSearch.groups || [];
    const posts = lastSearch.posts || [];
    syncSearchTabs();
    syncSortTabs();

    if (tab === "users") {
      if (!users.length) {
        feedEl.innerHTML = "";
        feedEmpty.hidden = false;
        feedEmpty.textContent = query ? `No people found for “${query}”.` : "Search for people.";
        return;
      }
      feedEmpty.hidden = true;
      feedEl.innerHTML =
        `<p class="search-section-title">People</p>` +
        users
          .map((u) =>
            searchHitCard({
              href: `/user/${encodeURIComponent(u.username || "")}`,
              avatarUrl: u.avatarUrl || "",
              label: u.displayName || u.username || "?",
              title: u.displayName || u.username || "member",
              subtitle: `@${u.username || ""}${u.isAlt ? " · alt" : ""}`,
            })
          )
          .join("");
      return;
    }

    if (tab === "groups") {
      if (!matchedGroups.length) {
        feedEl.innerHTML = "";
        feedEmpty.hidden = false;
        feedEmpty.textContent = query ? `No groups found for “${query}”.` : "Search for groups.";
        return;
      }
      feedEmpty.hidden = true;
      feedEl.innerHTML =
        `<p class="search-section-title">Groups</p>` +
        matchedGroups
          .map((g) =>
            searchHitCard({
              href: `/community/group/${encodeURIComponent(g.slug || "")}`,
              avatarUrl: "",
              label: g.slug || g.name || "?",
              title: g.name || g.slug || "group",
              subtitle: `${g.slug || ""}${g.postCount != null ? ` · ${g.postCount} posts` : ""}`,
              isGroup: true,
            })
          )
          .join("");
      return;
    }

    const showPreviews = tab === "all";
    let html = "";
    if (showPreviews && users.length) {
      html += `<p class="search-section-title">People</p>`;
      html += users
        .slice(0, 4)
        .map((u) =>
          searchHitCard({
            href: `/user/${encodeURIComponent(u.username || "")}`,
            avatarUrl: u.avatarUrl || "",
            label: u.displayName || u.username || "?",
            title: u.displayName || u.username || "member",
            subtitle: `@${u.username || ""}`,
          })
        )
        .join("");
    }
    if (showPreviews && matchedGroups.length) {
      html += `<p class="search-section-title">Groups</p>`;
      html += matchedGroups
        .slice(0, 4)
        .map((g) =>
          searchHitCard({
            href: `/community/group/${encodeURIComponent(g.slug || "")}`,
            avatarUrl: "",
            label: g.slug || g.name || "?",
            title: g.name || g.slug || "group",
            subtitle: g.slug || "",
            isGroup: true,
          })
        )
        .join("");
    }

    const ordered = sortedPosts(posts).filter((p) => !p.hidden);
    if (!ordered.length && !html) {
      feedEl.innerHTML = "";
      feedEmpty.hidden = false;
      feedEmpty.textContent = query ? `No results for “${query}”.` : "Type something to search.";
      return;
    }
    feedEmpty.hidden = true;
    if (ordered.length) {
      if (showPreviews) html += `<p class="search-section-title">Posts</p>`;
      renderFeed(ordered);
      if (html) feedEl.innerHTML = html + feedEl.innerHTML;
      return;
    }
    feedEl.innerHTML = html;
  }

  function renderFeed(posts) {
    lastPosts = Array.isArray(posts) ? posts.slice() : [];
    const ordered = sortedPosts(lastPosts).filter((p) => !p.hidden);
    if (!ordered.length) {
      feedEl.innerHTML = "";
      feedEmpty.hidden = false;
      if (feedEmpty) {
        feedEmpty.textContent =
          route.type === "group" && activeChannelSlug
            ? "No posts in this channel yet. Start the conversation."
            : route.type === "group"
              ? "No posts in this community yet. Be the first to post."
              : "No posts yet. Start the conversation.";
      }
      return;
    }
    feedEmpty.hidden = true;
    syncSortTabs();
    feedEl.innerHTML = ordered
      .map((post) => {
        const group = post.group;
        const author = post.author || {};
        const username = author.username || "member";
        const showGroup = route.type !== "group" && group;
        const title = postTitle(post);
        const bodyText = postBodyText(post);
        const vote = Number(post.myVote) || 0;
        const saved = !!post.saved;
        const score = displayScore(post);
        const comments = Number(post.commentCount) || 0;
        const pid = escapeHtml(String(post.id || ""));
        const media = renderPostMedia(post);
        const commentLabel = comments === 1 ? "1 comment" : `${comments} comments`;
        const suggestionStatus = String(post.suggestionStatus || "").toLowerCase();
        const isSuggestion =
          suggestionStatus ||
          (post.channel && String(post.channel.kind || "").toLowerCase() === "suggestions");
        const canModerateSuggestion = !!(
          isSuggestion &&
          me &&
          (me.isStaff || me.role === "owner" || me.role === "admin")
        );
        const statusBadge = isSuggestion
          ? `<span class="suggestion-status is-${escapeHtml(suggestionStatus || "open")}">${escapeHtml(
              suggestionStatus === "accepted"
                ? "Accepted"
                : suggestionStatus === "denied"
                  ? "Denied"
                  : "Open"
            )}</span>`
          : "";
        const suggestionActions = canModerateSuggestion
          ? `<div class="suggestion-actions">
              <button class="btn btn-secondary btn-compact" type="button" data-suggestion-status="accepted" data-post-id="${pid}">Accept</button>
              <button class="btn btn-secondary btn-compact" type="button" data-suggestion-status="denied" data-post-id="${pid}">Deny</button>
              <button class="btn btn-secondary btn-compact" type="button" data-suggestion-status="open" data-post-id="${pid}">Reopen</button>
            </div>`
          : "";
        return `
          <article class="reddit-post ${isSuggestion ? "is-suggestion" : ""}" data-post-id="${pid}">
            <div class="reddit-vote" aria-label="Vote">
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">${ico("up", 18)}</button>
              <span class="reddit-vote-count">${score}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">${ico("down", 18)}</button>
            </div>
            <div class="reddit-post-main">
              <div class="reddit-post-meta">
                ${
                  showGroup
                    ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.slug)}</a><span class="reddit-meta-dot">•</span>`
                    : ""
                }
                ${
                  post.channel && post.channel.label
                    ? `<span class="reddit-channel-pill">${escapeHtml(
                        formatChannelLabel(post.channel)
                      )}</span><span class="reddit-meta-dot">•</span>`
                    : ""
                }
                ${statusBadge}
                <span class="reddit-meta-by">Posted by</span>
                ${renderAuthorLink(author, { withAvatar: true })}
                <span class="reddit-meta-dot">•</span>
                <time class="reddit-meta-time">${escapeHtml(formatRelative(post.createdAt))}</time>
              </div>
              <a class="reddit-post-title-link" href="/community/post/${pid}" data-open-post="${pid}">
                <h3 class="reddit-post-title">${escapeHtml(title)}</h3>
              </a>
              ${bodyText ? `<p class="reddit-post-body">${escapeHtml(truncateText(bodyText, 180))}</p>` : ""}
              ${media}
              ${suggestionActions}
              <div class="reddit-post-actions">
                <a class="reddit-action" href="/community/post/${pid}" data-open-post="${pid}">${ico("comment", 16)} <span>${escapeHtml(commentLabel)}</span></a>
                <button class="reddit-action" type="button" data-share-post="${pid}">${ico("share", 16)} <span>Share</span></button>
                <button class="reddit-action ${saved ? "is-active" : ""}" type="button" data-save-post="${pid}">${ico("bookmark", 16)} <span>${saved ? "Saved" : "Save"}</span></button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPostDetail(post) {
    const el = document.getElementById("post-detail");
    if (!el) return;
    if (!post) {
      el.innerHTML = '<p class="muted">Post not found.</p>';
      return;
    }
    const group = post.group || {};
    const author = post.author || {};
    const username = author.username || "member";
    const title = postTitle(post);
    const bodyText = postBodyText(post);
    const vote = Number(post.myVote) || 0;
    const saved = !!post.saved;
    const comments = Number(post.commentCount) || 0;
    const pid = escapeHtml(String(post.id || ""));
    const media = renderPostMedia(post, { large: true });
    el.innerHTML = `
      <article class="reddit-post reddit-post-detail-inner" data-post-id="${pid}">
        <div class="reddit-vote">
          <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">${ico("up", 18)}</button>
          <span class="reddit-vote-count">${displayScore(post)}</span>
          <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">${ico("down", 18)}</button>
        </div>
        <div class="reddit-post-main">
          <div class="reddit-post-meta">
            ${group.slug ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.slug)}</a><span class="muted">•</span>` : ""}
            <span class="muted">by</span>
            ${renderAuthorLink(author, { withAvatar: true })}
            <span class="muted">${escapeHtml(formatRelative(post.createdAt))}</span>
          </div>
          <h1 class="reddit-post-title reddit-post-title-lg">${escapeHtml(title)}</h1>
          ${bodyText ? `<div class="reddit-post-body reddit-post-body-lg">${escapeHtml(bodyText)}</div>` : ""}
          ${media}
          <div class="reddit-post-actions">
            <span class="reddit-action">${ico("comment", 16)} <span>${comments}</span></span>
            <button class="reddit-action" type="button" data-share-post="${pid}">${ico("share", 16)} <span>Share</span></button>
            <button class="reddit-action ${saved ? "is-active" : ""}" type="button" data-save-post="${pid}">${ico("bookmark", 16)} <span>${saved ? "Saved" : "Save"}</span></button>
          </div>
        </div>
      </article>
    `;
  }

  function renderComments(comments) {
    const list = document.getElementById("comments-list");
    const empty = document.getElementById("comments-empty");
    if (!list) return;
    lastComments = Array.isArray(comments) ? comments.slice() : [];
    if (!lastComments.length) {
      list.innerHTML = "";
      if (empty) {
        empty.hidden = false;
        empty.textContent = "No comments yet — share the first thought.";
      }
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = lastComments
      .map((comment) => {
        const author = comment.author || {};
        const username = author.username || "member";
        const vote = Number(comment.myVote) || 0;
        const cid = escapeHtml(String(comment.id || ""));
        return `
          <article class="reddit-comment" data-comment-id="${cid}">
            <div class="reddit-vote reddit-vote-sm">
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="comment" data-comment-id="${cid}" aria-label="Upvote">${ico("up", 16)}</button>
              <span class="reddit-vote-count">${Number(comment.score) || 0}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="comment" data-comment-id="${cid}" aria-label="Downvote">${ico("down", 16)}</button>
            </div>
            <div class="reddit-comment-main">
              <div class="reddit-post-meta">
                ${renderAuthorLink(author, { withAvatar: true })}
                <span class="muted">• ${escapeHtml(formatRelative(comment.createdAt))}</span>
              </div>
              <div class="reddit-comment-body">${escapeHtml(comment.body || "")}</div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function normalizeNotifKind(kind) {
    return String(kind || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
  }

  function describeNotification(note) {
    const kind = normalizeNotifKind(note && note.kind);
    const actor = String((note && (note.actorUsername || note.actor)) || "").trim() || "Someone";
    const serverTitle = String((note && note.title) || "").trim();
    const serverDesc = String((note && (note.description || note.body)) || "").trim();
    let title = serverTitle;
    let description = serverDesc;
    if (kind === "friend_request") {
      title = title || "Friend request";
      description = description || `${actor} sent you a friend request.`;
    } else if (kind === "friend_accept" || kind === "friend_accepted") {
      title = title || "Friend request accepted";
      description = description || `${actor} accepted your friend request.`;
    } else if (kind === "comment") {
      title = title || "New comment";
      description = description || `${actor} commented on your post.`;
    } else if (kind === "comment_reply_on_post" || kind === "comment_reply_on_post") {
      title = title || "Reply on your post";
      description = description || `${actor} replied to a comment on your post.`;
    } else if (kind === "reply") {
      title = title || "New reply";
      description = description || `${actor} replied to your comment.`;
    } else if (kind === "dm" || kind === "message") {
      title = title || "New message";
      description = description || `${actor} sent you a message.`;
    } else if (kind === "app_update" || kind === "app_updated" || kind === "update") {
      title = title || "App updated";
      description =
        description || "Synk was updated. Refresh or reopen to get the latest.";
    } else {
      title = title || "Notification";
      description = description || `${actor} sent you a notification.`;
    }
    // Ensure sentence punctuation for short system sentences.
    if (description && !/[.!?]$/.test(description)) description += ".";
    const actions = [];
    if (kind === "app_update" || kind === "app_updated" || kind === "update") {
      actions.push({ type: "refresh", label: "Refresh", primary: true });
      actions.push({ type: "release-notes", label: "Release notes", primary: false });
      if (isCurrentUserBetaTester()) {
        actions.push({
          type: "testing-portal",
          label: "Open testing portal",
          primary: false,
        });
      }
    } else if (kind === "friend_request") {
      actions.push({ type: "friend-accept", label: "Accept", primary: true });
      actions.push({ type: "friend-decline", label: "Decline", primary: false });
      if (actor && actor !== "Someone") {
        actions.push({ type: "view-profile", label: "View profile", primary: false });
      }
    } else if (kind === "friend_accept" || kind === "friend_accepted") {
      if (actor && actor !== "Someone") {
        actions.push({ type: "view-profile", label: "View profile", primary: true });
        actions.push({ type: "message", label: "Message", primary: false });
      }
    } else if (kind === "dm" || kind === "message") {
      if (actor && actor !== "Someone") {
        actions.push({ type: "message", label: "Open chat", primary: true });
      }
    } else if (note && note.postId) {
      actions.push({ type: "view-post", label: "View post", primary: true });
    }
    return { kind, actor, title, description, actions };
  }

  function renderNotifActions(note, meta) {
    const actor = escapeHtml(meta.actor);
    const postId = note.postId ? escapeHtml(String(note.postId)) : "";
    return (meta.actions || [])
      .map((action) => {
        const cls = action.primary ? "btn btn-primary btn-compact" : "btn btn-secondary btn-compact";
        if (action.type === "friend-accept") {
          return `<button class="${cls}" type="button" data-notif-friend="accept" data-username="${actor}">Accept</button>`;
        }
        if (action.type === "friend-decline") {
          return `<button class="${cls}" type="button" data-notif-friend="decline" data-username="${actor}">Decline</button>`;
        }
        if (action.type === "view-profile") {
          return `<a class="${cls}" href="/user/${encodeURIComponent(meta.actor)}">View profile</a>`;
        }
        if (action.type === "message") {
          return `<button class="${cls}" type="button" data-notif-message="${actor}">${escapeHtml(action.label || "Message")}</button>`;
        }
        if (action.type === "view-post" && postId) {
          return `<button class="${cls}" type="button" data-open-post="${postId}">View post</button>`;
        }
        if (action.type === "refresh") {
          return `<button class="${cls}" type="button" data-notif-refresh="1">${escapeHtml(action.label || "Refresh")}</button>`;
        }
        if (action.type === "release-notes") {
          const version = escapeHtml(String((note && note.version) || ""));
          return `<button class="${cls}" type="button" data-notif-release-notes="1" data-version="${version}">${escapeHtml(action.label || "Release notes")}</button>`;
        }
        if (action.type === "testing-portal") {
          return `<a class="${cls}" href="/testing">${escapeHtml(action.label || "Open testing portal")}</a>`;
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }

  function renderInbox(notifications) {
    const list = document.getElementById("inbox-list");
    const empty = document.getElementById("inbox-empty");
    if (!list) return;
    lastNotifications = Array.isArray(notifications) ? notifications.slice() : [];
    if (!lastNotifications.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = lastNotifications
      .map((note) => {
        const meta = describeNotification(note);
        const nid = escapeHtml(String(note.id || ""));
        const unread = !note.readAt;
        const postId = note.postId ? escapeHtml(String(note.postId)) : "";
        const actions = renderNotifActions(note, meta);
        const openAttr =
          postId && meta.kind !== "friend_request"
            ? `data-open-post="${postId}" data-inbox-id="${nid}"`
            : "";
        return `
          <article class="reddit-inbox-row ${unread ? "is-unread" : ""}" data-inbox-id="${nid}" ${openAttr}>
            <div class="reddit-inbox-row-copy">
              <div class="reddit-inbox-row-head">
                <strong class="reddit-inbox-title">${escapeHtml(meta.title)}</strong>
                <span class="muted reddit-inbox-time">${escapeHtml(formatRelative(note.createdAt))}</span>
              </div>
              <p class="reddit-inbox-desc">${escapeHtml(meta.description)}</p>
              ${actions ? `<div class="reddit-inbox-actions reddit-notif-actions">${actions}</div>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function applyUsernameState() {
    const usernameCard = document.getElementById("username-card");
    const settingsView = document.getElementById("settings-view");
    const feedView = document.getElementById("feed-view");
    const myProfileLink = document.getElementById("my-profile-link");
    const myProfileLabel = document.getElementById("my-profile-label");
    const settingsUsername = document.getElementById("settings-username");
    const needsUsername = !publicUsername;
    if (usernameCard) usernameCard.hidden = !needsUsername;
    communityMain.hidden = needsUsername;
    const onSettings = route.type === "settings";
    const onSubmit = route.type === "submit";
    const onMod = route.type === "mod";
    const onPost = route.type === "post";
    const onInbox = route.type === "inbox";
    const onGroups = route.type === "groups";
    const onFeed = !onSettings && !onSubmit && !onMod && !onPost && !onInbox;
    if (feedView) feedView.hidden = needsUsername || !(onFeed || onGroups);
    if (settingsView) settingsView.hidden = needsUsername || !onSettings;
    if (submitView) submitView.hidden = needsUsername || !onSubmit;
    if (modView) modView.hidden = needsUsername || !onMod;
    if (postView) postView.hidden = needsUsername || !onPost;
    if (inboxView) inboxView.hidden = needsUsername || !onInbox;
    if (composerCard) {
      composerCard.hidden = needsUsername || !onFeed || route.type === "user" || route.type === "search";
    }
    const settingsNav = document.getElementById("settings-nav-link");
    if (settingsNav) settingsNav.classList.toggle("is-active", onSettings);
    const submitNav = document.getElementById("submit-nav-link");
    if (submitNav) submitNav.classList.toggle("is-active", onSubmit);
    const modNav = document.getElementById("mod-nav-link");
    if (modNav) modNav.classList.toggle("is-active", onMod);
    if (popularLink) popularLink.classList.toggle("is-active", route.type === "popular");
    try { refreshModToolsChrome(); } catch (_) {}
    const inboxBtn = document.getElementById("inbox-btn");
    if (inboxBtn) inboxBtn.classList.toggle("is-active", onInbox);

    const messagesNavLink = document.getElementById("messages-nav-link");
    if (messagesNavLink) messagesNavLink.classList.toggle("is-active", onInbox && inboxTab === "messages");
    const notificationsNavLink = document.getElementById("notifications-nav-link");
    if (notificationsNavLink) notificationsNavLink.classList.toggle("is-active", onInbox && inboxTab === "notifications");
    const groupsNavLink = document.getElementById("groups-nav-link");
    if (groupsNavLink) groupsNavLink.classList.toggle("is-active", route.type === "groups");

    if (onInbox) {
      try { setNotifOpen(false); } catch (_) {}
    }
    if (publicUsername) {
      const gateInput = document.getElementById("public-username");
      if (gateInput) gateInput.value = publicUsername;
      if (settingsUsername) settingsUsername.value = publicUsername;
      const settingsDisplay = document.getElementById("settings-display-name");
      if (settingsDisplay) {
        let shown = displayName || "";
        if (activePersona && activePersona !== publicUsername) {
          const alt = (alts || []).find((a) => a.username === activePersona);
          shown = (alt && alt.displayName) || "";
        }
        settingsDisplay.value = shown;
      }
      const settingsBio = document.getElementById("settings-bio");
      if (settingsBio && document.activeElement !== settingsBio) {
        settingsBio.value = bio || "";
      }
      const settingsDm = document.getElementById("settings-dm-policy");
      if (settingsDm) settingsDm.value = dmPolicy || "friends";
      if (myProfileLink) {
        myProfileLink.hidden = false;
        myProfileLink.href = `/user/${encodeURIComponent(publicUsername)}`;
      }
      {
        const menuLabel = activeDisplayLabel();
        const faceUrl = activeCommunityAvatarUrl();
        if (myProfileLabel) myProfileLabel.textContent = menuLabel;
        const menuName = document.getElementById("user-menu-name");
        const menuSub = document.getElementById("user-menu-sub");
        if (menuName) menuName.textContent = menuLabel;
        if (menuSub) menuSub.textContent = activePersona || publicUsername || "Account";
        paintAvatar(document.getElementById("user-menu-avatar"), faceUrl, menuLabel);
        paintAvatar(document.getElementById("menu-profile-avatar"), faceUrl, menuLabel);
        paintAvatar(document.getElementById("settings-avatar-preview"), faceUrl, menuLabel);
        const sideMenuName = document.getElementById("menu-profile-name");
        const sideMenuHandle = document.getElementById("menu-profile-handle");
        if (sideMenuName) sideMenuName.textContent = menuLabel;
        if (sideMenuHandle) sideMenuHandle.textContent = activePersona || publicUsername ? `@${activePersona || publicUsername}` : "Account";
        const menuProfileLink = document.getElementById("menu-profile-link");
        if (menuProfileLink && publicUsername) {
          menuProfileLink.href = `/user/${encodeURIComponent(publicUsername)}`;
          menuProfileLink.hidden = false;
        }
      }
    } else if (myProfileLink) {
      myProfileLink.hidden = true;
    }
    const settingsLink = document.getElementById("settings-link");
    if (settingsLink) settingsLink.classList.toggle("is-active", onSettings);
    if (homeLink) homeLink.classList.toggle("is-active", route.type === "home");
    const submitAs = document.getElementById("submit-as");
    if (submitAs) {
      submitAs.textContent = activePersona
        ? `Posting as ${activePersona}`
        : publicUsername
          ? `Posting as ${publicUsername}`
          : "Posting as —";
    }
    syncPersonaUi();
  }

    function syncTabBar() {
    const bar = document.getElementById("community-tabbar");
    if (!bar) return;
    const show = !!(me && publicUsername);
    bar.hidden = !show;
    const meTab = document.getElementById("tab-me");
    if (meTab && publicUsername) {
      meTab.href = `/user/${encodeURIComponent(publicUsername)}`;
    }
    let tab = "home";
    if (route.type === "popular") tab = "popular";
    else if (route.type === "submit") tab = "submit";
    else if (route.type === "inbox") tab = "inbox";
    else if (route.type === "user" && publicUsername && route.username === publicUsername) tab = "me";
    else if (route.type === "settings") tab = "me";
    bar.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("is-active", el.getAttribute("data-tab") === tab);
    });
  }

  function applyStaffState() {
    const isStaff = !!(me && me.isStaff);
    const isOwner = !!(me && me.isOwner);
    staffTools.hidden = !isStaff;
    const modNavLink = document.getElementById("mod-nav-link");
    if (modNavLink) modNavLink.hidden = !isStaff;
    const modMenuLink = document.getElementById("mod-menu-link");
    if (modMenuLink) modMenuLink.hidden = !isStaff;
    ownerTools.hidden = !isOwner;
    document.getElementById("owner-label").textContent = ownerUsername;
    renderStaff();
    renderAlts();
    renderTagCatalog();
    syncPersonaUi();
    refreshModToolsChrome();
    if (!isStaff && route.type === "mod") {
      route = { type: "home", slug: "", username: "" };
      try {
        history.replaceState(route, "", "/community");
      } catch (_) {}
      applyUsernameState();
    }
  }

  
  function isDiscordTheme(group) {
    // Discord UI is only for the official Synk group.
    return !!(group && (group.isOfficial || group.slug === "synk"));
  }

  function capitalizeChannelName(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw === raw.toUpperCase() && /[A-Z]/.test(raw)) return raw;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function formatChannelPill(channel) {
    if (!channel) return "";
    if (channel.label) return formatChannelLabel({ label: channel.label, emoji: channel.emoji, name: channel.name, slug: channel.slug });
    return formatChannelLabel(channel);
  }

  function formatChannelLabel(ch) {
    if (!ch) return "";
    if (ch.label) {
      // Ensure display capitalizes the name portion after "emoji | ".
      const parts = String(ch.label).split("|");
      if (parts.length >= 2) {
        const emoji = parts[0].trim();
        const name = capitalizeChannelName(parts.slice(1).join("|").trim());
        return emoji && name ? `${emoji} | ${name}` : name || emoji;
      }
      return capitalizeChannelName(ch.label);
    }
    if (ch.emoji && ch.name) return `${ch.emoji} | ${capitalizeChannelName(ch.name)}`;
    return capitalizeChannelName(ch.name || ch.slug || "");
  }

  function activeChannelMeta(group) {
    const channels = Array.isArray(group && group.channels) ? group.channels : [];
    return channels.find((c) => c.slug === activeChannelSlug) || channels[0] || null;
  }

  function canPostInChannel(channel) {
    if (!channel) return true;
    const kind = String(channel.kind || "").toLowerCase();
    if (kind === "announcements" || kind === "readonly") {
      return !!(me && (me.isStaff || me.role === "owner" || me.role === "admin"));
    }
    return true;
  }

  function channelButtonHtml(ch) {
    const on = ch.slug === activeChannelSlug ? "is-active" : "";
    const label = formatChannelLabel(ch);
    return `<button type="button" class="discord-channel-btn ${on}" data-discord-channel="${escapeHtml(
      ch.slug
    )}" title="${escapeHtml(label)}"><span class="discord-channel-label">${escapeHtml(
      label
    )}</span></button>`;
  }

  function mountFeedStack(intoDiscord) {
    const stack = document.getElementById("feed-stack");
    const slot = document.getElementById("discord-feed-slot");
    const home = document.getElementById("feed-view");
    if (!stack || !slot || !home) return;
    if (intoDiscord) {
      if (stack.parentElement !== slot) slot.appendChild(stack);
    } else if (stack.parentElement === slot) {
      const crumbs = document.getElementById("crumbs");
      if (crumbs && crumbs.parentElement === home) {
        crumbs.insertAdjacentElement("afterend", stack);
      } else {
        home.appendChild(stack);
      }
    }
  }

  function submitUrlForGroup(groupSlug, channelSlug) {
    let href = "/community/submit";
    const params = new URLSearchParams();
    if (groupSlug) params.set("group", groupSlug);
    if (channelSlug) params.set("channel", channelSlug);
    const q = params.toString();
    return q ? `${href}?${q}` : href;
  }

  function renderDiscordChannels(group) {
    const shell = document.getElementById("discord-shell");
    const host = document.getElementById("discord-channels");
    if (!shell || !host) return;
    if (!isDiscordTheme(group)) {
      shell.hidden = true;
      document.body.classList.remove("is-discord-group");
      mountFeedStack(false);
      return;
    }
    document.body.classList.add("is-discord-group");
    shell.hidden = false;
    mountFeedStack(true);
    const categories = Array.isArray(group.categories) ? group.categories.slice() : [];
    const channels = Array.isArray(group.channels) ? group.channels.slice() : [];
    if (!activeChannelSlug) {
      const general = channels.find((c) => c.slug === "general");
      activeChannelSlug = (general && general.slug) || (channels[0] && channels[0].slug) || "";
      if (activeChannelSlug && route.type === "group") {
        route = { ...route, channel: activeChannelSlug };
        try {
          history.replaceState(route, "", routeUrl(route));
        } catch (_) {}
      }
    }
    const byCat = new Map();
    categories.forEach((cat) => byCat.set(String(cat.id), { cat, list: [] }));
    const loose = [];
    channels.forEach((ch) => {
      const key = ch.categoryId != null ? String(ch.categoryId) : "";
      if (key && byCat.has(key)) byCat.get(key).list.push(ch);
      else loose.push(ch);
    });
    const html = [];
    for (const { cat, list } of byCat.values()) {
      html.push(`<div class="discord-cat">${escapeHtml(cat.name)}</div>`);
      list
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
        .forEach((ch) => html.push(channelButtonHtml(ch)));
    }
    if (loose.length) {
      html.push(`<div class="discord-cat">CHANNELS</div>`);
      loose.forEach((ch) => html.push(channelButtonHtml(ch)));
    }
    host.innerHTML = html.join("") || `<p class="muted" style="padding:8px;">No channels yet.</p>`;
    const active = channels.find((c) => c.slug === activeChannelSlug) || channels[0] || null;
    const title = document.getElementById("discord-channel-title");
    const desc = document.getElementById("discord-channel-desc");
    if (title) title.textContent = active ? formatChannelLabel(active) : "Synk";
    if (desc) {
      desc.textContent = (active && (active.description || "")) || "";
      desc.hidden = !desc.textContent;
    }
    const composerOpen = document.getElementById("composer-open-btn");
    if (composerOpen && route.slug) {
      const allowed = canPostInChannel(active);
      composerOpen.hidden = !allowed;
      if (allowed) {
        composerOpen.href = submitUrlForGroup(route.slug, activeChannelSlug);
        const kind = String((active && active.kind) || "").toLowerCase();
        const chName = active ? formatChannelLabel(active) : "this channel";
        if (kind === "suggestions") composerOpen.textContent = `Suggest in ${chName}`;
        else if (kind === "announcements") composerOpen.textContent = `Announce in ${chName}`;
        else composerOpen.textContent = `Post in ${chName}`;
      }
    }
    const feedHint = document.getElementById("discord-channel-hint");
    if (feedHint) {
      const kind = String((active && active.kind) || "").toLowerCase();
      if (kind === "announcements") {
        feedHint.hidden = false;
        feedHint.textContent = canPostInChannel(active)
          ? "Announcements — only Synk staff can post here. These stay out of the main feed."
          : "Announcements — only Synk staff can post here. Browse updates below.";
      } else if (kind === "readonly") {
        feedHint.hidden = false;
        feedHint.textContent = "Read-only channel. Synk staff maintain this board.";
      } else if (kind === "suggestions") {
        feedHint.hidden = false;
        feedHint.textContent =
          "Suggestions forum — upvote ideas. Synk staff can accept or deny them. Stays out of the main feed.";
      } else {
        feedHint.hidden = true;
        feedHint.textContent = "";
      }
    }
  }

  function renderGroupRoles(group) {
    const widget = document.getElementById("group-roles-widget");
    const list = document.getElementById("group-roles-list");
    const form = document.getElementById("group-role-form");
    if (!widget || !list) return;
    if (!(route.type === "group" && group)) {
      widget.hidden = true;
      return;
    }
    widget.hidden = false;
    const roles = Array.isArray(group.roles) ? group.roles : [];
    list.innerHTML = roles.length
      ? roles
          .map(
            (r) =>
              `<div class="group-role-chip"><span class="group-role-dot" style="background:${escapeHtml(
                r.color || "#94a3b8"
              )}"></span><span>${escapeHtml(r.name)}</span></div>`
          )
          .join("")
      : `<p class="muted" style="margin:0;font-size:0.85rem;">No roles yet.</p>`;
    const myId = me && (me.profileId || me.id || "");
    const canManage =
      !!(me && (me.role === "owner" || me.role === "admin" || me.isStaff)) ||
      !!(group.createdBy && myId && String(group.createdBy) === String(myId));
    if (form) form.hidden = !canManage;
  }

  function syncJoinCopy(joined, group) {
    const joinLabel = group && (group.isOfficial || group.slug === "synk") ? "Join Synk" : "Join";
    ["join-community-btn", "about-join-btn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.hidden) return;
      btn.textContent = joined ? "Joined" : joinLabel;
      btn.classList.toggle("is-joined", !!joined);
      btn.setAttribute("aria-pressed", joined ? "true" : "false");
    });
  }

function applyViewState(data) {
    if (route.type !== "group") {
      const shell = document.getElementById("discord-shell");
      if (shell) shell.hidden = true;
      document.body.classList.remove("is-discord-group");
      mountFeedStack(false);
      const rolesWidget = document.getElementById("group-roles-widget");
      if (rolesWidget) rolesWidget.hidden = true;
      activeChannelSlug = "";
      activeGroupDetail = null;
      const composerOpen = document.getElementById("composer-open-btn");
      if (composerOpen) {
        composerOpen.href = "/community/submit";
        composerOpen.textContent = "Create a post";
      }
    }
    renderCrumbs();
    if (profileMeta) {
      profileMeta.hidden = true;
      profileMeta.innerHTML = "";
    }
    const pageHead = document.getElementById("page-head");
    if (pageHead) pageHead.hidden = true;
    syncSortTabs();
    syncSearchTabs();

    if (route.type !== "user") restoreJoinButton();
    const joinBtn = document.getElementById("join-community-btn");
    const aboutJoin = document.getElementById("about-join-btn");
    const showJoin = route.type === "group" && !!route.slug;
    const groupJoined =
      (data && data.group && typeof data.group.joined === "boolean"
        ? data.group.joined
        : activeGroupJoined) || false;
    activeGroupJoined = !!groupJoined;
    if (joinBtn) {
      joinBtn.hidden = !showJoin;
      if (showJoin) joinBtn.textContent = activeGroupJoined ? "Joined" : "Join";
      joinBtn.classList.toggle("is-joined", showJoin && activeGroupJoined);
    }
    if (aboutJoin) {
      aboutJoin.hidden = !showJoin;
      if (showJoin) aboutJoin.textContent = activeGroupJoined ? "Joined" : "Join";
      aboutJoin.classList.toggle("is-joined", showJoin && activeGroupJoined);
    }

    const createTop = document.getElementById("create-top-link");
    const submitHref =
      route.type === "group" && route.slug
        ? submitUrlForGroup(route.slug, route.channel || activeChannelSlug || "")
        : "/community/submit";
    if (createTop) createTop.href = submitHref;
    const composerOpenBtn = document.getElementById("composer-open-btn");
    if (composerOpenBtn && route.type === "group" && route.slug) {
      composerOpenBtn.href = submitHref;
    }

    const viewBlurb = document.getElementById("view-blurb");
    const viewIcon = document.getElementById("view-icon");

    if (route.type === "settings" || route.type === "submit" || route.type === "mod" || route.type === "inbox") {
      setBannerMode("", false);
      updateAboutRail(data);
      return;
    }
    if (route.type === "post") {
      setBannerMode("", false);
      activePostId = route.postId || "";
      const post =
        (data && data.post) ||
        (lastPosts || []).find((p) => String(p.id) === String(activePostId)) ||
        ((data && data.posts) || []).find((p) => String(p.id) === String(activePostId));
      renderPostDetail(post || null);
      renderComments((data && data.comments) || lastComments || []);
      updateAboutRail(data);
      return;
    }
    if (route.type === "user") {
      const profile = data.profile || { username: route.username };
      activeProfile = profile;
      const uname = profile.username || route.username || "";
      const dname = String(profile.displayName || "").trim() || uname;
      const isSelf = !!(profile.isSelf || (publicUsername && publicUsername === uname));
      const friendship = (profile.friendship && profile.friendship.status) || "none";
      const canMessage = !!profile.canMessage;
      const profileBio = String(profile.bio || "").trim();
      setBannerMode("user", true);
      paintAvatar(viewIcon, profile.avatarUrl || "", dname);
      setText("view-title", dname);
      const bits = [];
      bits.push(`${Number(profile.postCount || 0)} post${Number(profile.postCount || 0) === 1 ? "" : "s"}`);
      if (profile.joinedAt) bits.push(`Joined ${formatWhen(profile.joinedAt)}`);
      setText("view-sub", bits.join(" · "));
      if (viewBlurb) {
        viewBlurb.hidden = !profileBio;
        viewBlurb.textContent = profileBio || "";
        if (!profileBio && isSelf) {
          viewBlurb.hidden = false;
          viewBlurb.textContent = "Add a bio in Settings.";
        }
      }
      // Never show community Join on profiles — Friend / Message / Edit only.
      if (joinBtn) {
        joinBtn.hidden = true;
        joinBtn.setAttribute("hidden", "");
      }
      const aboutJoinBtn = document.getElementById("about-join-btn");
      if (aboutJoinBtn) {
        aboutJoinBtn.hidden = true;
        aboutJoinBtn.setAttribute("hidden", "");
      }
      const actionsHost = document.querySelector("#view-banner .reddit-community-actions");
      let actions = "";
      if (!isSelf && publicUsername) {
        if (friendship === "friends") {
          actions += `<button class="btn btn-secondary btn-compact" type="button" data-profile-action="unfriend" data-username="${escapeHtml(uname)}">Friends</button>`;
        } else if (friendship === "pending_out") {
          actions += `<button class="btn btn-secondary btn-compact" type="button" data-profile-action="cancel-friend" data-username="${escapeHtml(uname)}">Requested</button>`;
        } else if (friendship === "pending_in") {
          actions += `<button class="btn btn-primary btn-compact" type="button" data-profile-action="accept-friend" data-username="${escapeHtml(uname)}">Accept</button>`;
          actions += `<button class="btn btn-secondary btn-compact" type="button" data-profile-action="decline-friend" data-username="${escapeHtml(uname)}">Decline</button>`;
        } else {
          actions += `<button class="btn btn-secondary btn-compact" type="button" data-profile-action="add-friend" data-username="${escapeHtml(uname)}">Add friend</button>`;
        }
        // Reddit-style Chat/DM — never Join on profiles.
        if (canMessage || friendship === "friends") {
          actions += `<button class="btn btn-primary btn-compact" type="button" data-profile-action="message" data-username="${escapeHtml(uname)}" ${canMessage ? "" : "disabled"}>Chat</button>`;
        } else {
          actions += `<button class="btn btn-primary btn-compact" type="button" data-profile-action="message" data-username="${escapeHtml(uname)}" disabled title="Messaging not available">Chat</button>`;
        }
      } else if (isSelf) {
        actions += `<a class="btn btn-secondary btn-compact" href="/community/settings">Edit profile</a>`;
      }
      if (actionsHost) {
        actionsHost.innerHTML = actions;
      }
      if (profileMeta) {
        const tagsHtml = (profile.tags || []).length
          ? (profile.tags || [])
              .map((tag) =>
                tagChip(tag, {
                  canPin: canPinTagsFor(profile.username),
                })
              )
              .join("")
          : "";
        profileMeta.hidden = !tagsHtml;
        profileMeta.innerHTML = tagsHtml
          ? `<div class="community-profile-card community-profile-card-clean"><div class="community-tag-list synk-tag-badge-row">${tagsHtml}</div></div>`
          : "";
      }
      composerCard.hidden = true;
      updateAboutRail(data);
      return;
    }
    if (route.type === "group") {
      const group = data.group || groups.find((g) => g.slug === route.slug) || null;
      activeGroupDetail = group;
      if (group) pushRecent(group);
      if (data.channel && data.channel.slug) activeChannelSlug = data.channel.slug;
      else if (route.channel) activeChannelSlug = route.channel;
      const slug = (group && group.slug) || route.slug || "";
      const name = (group && group.name) || slug;
      const postCount = group && group.postCount != null ? Number(group.postCount) : null;
      const memberCount = group && group.memberCount != null ? Number(group.memberCount) : null;
      setBannerMode("group", true);
      if (viewIcon) viewIcon.textContent = (slug || "?").slice(0, 1).toUpperCase();
      const official =
        group && (group.isOfficial || group.slug === "synk")
          ? ' <span class="official-pill">Official</span>'
          : "";
      const titleEl = document.getElementById("view-title");
      if (titleEl) titleEl.innerHTML = `${escapeHtml(name)}${official}`;
      else setText("view-title", name);
      const subBits = [slug];
      if (memberCount != null) subBits.push(`${memberCount.toLocaleString()} member${memberCount === 1 ? "" : "s"}`);
      else if (postCount != null) subBits.push(`${postCount.toLocaleString()} post${postCount === 1 ? "" : "s"}`);
      setText("view-sub", subBits.filter(Boolean).join(" · "));
      if (viewBlurb) {
        const desc = (group && group.description) || "";
        viewBlurb.textContent = desc;
        viewBlurb.hidden = !desc;
      }
      renderDiscordChannels(group);
      renderGroupRoles(group);
      syncJoinCopy(activeGroupJoined, group);
      updateAboutRail(data);
      return;
    }
    if (route.type === "search") {
      setBannerMode("search", false);
      if (viewBlurb) {
        viewBlurb.hidden = true;
        viewBlurb.textContent = "";
      }
      if (pageHead) pageHead.hidden = false;
      const q = route.query || "";
      setText("page-head-title", q ? `Results for “${q}”` : "Search");
      // Real tab controls live in #search-tabs — keep this subtitle quiet.
      setText("page-head-sub", "Posts, people, and groups");
      const jumpInput = document.getElementById("jump-input");
      if (jumpInput && q && document.activeElement !== jumpInput) jumpInput.value = q;
      if (composerCard) composerCard.hidden = true;
      const discordShell = document.getElementById("discord-shell");
      if (discordShell) discordShell.hidden = true;
      document.body.classList.remove("is-discord-group");
      mountFeedStack(false);
      syncSearchTabs();
      updateAboutRail(data);
      return;
    }
    if (route.type === "popular") {
      setBannerMode("popular", false);
      if (viewBlurb) {
        viewBlurb.hidden = true;
        viewBlurb.textContent = "";
      }
      if (pageHead) pageHead.hidden = false;
      setText("page-head-title", "Popular");
      setText("page-head-sub", "Trending across communities");
      updateAboutRail(data);
      return;
    }
    // home
    setBannerMode("home", false);
    if (viewBlurb) {
      viewBlurb.hidden = true;
      viewBlurb.textContent = "";
    }
    if (pageHead) pageHead.hidden = false;
    setText("page-head-title", "Feed");
    setText("page-head-sub", "Latest from your communities");
    updateAboutRail(data);
  }

  async function loadCommunity({ soft = false } = {}) {
    let url = "/api/synk-community";
    const sort = apiSort();
    if (route.type === "post" && route.postId) {
      url += `?post=${encodeURIComponent(route.postId)}`;
    } else if (route.type === "inbox") {
      url += "?inbox=1";
    } else if (
      route.type === "settings" ||
      route.type === "submit" ||
      route.type === "mod" ||
      route.type === "groups" ||
      soft
    ) {
      // Lightweight shell payload — no feed posts.
      url += "?shell=1";
    } else if (route.type === "popular") {
      url += `?feed=popular&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "home") {
      url += `?feed=home&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "group" && route.slug) {
      url += `?group=${encodeURIComponent(route.slug)}&sort=${encodeURIComponent(sort)}`;
      const ch = route.channel || activeChannelSlug || "";
      if (ch) url += `&channel=${encodeURIComponent(ch)}`;
    } else if (route.type === "user" && route.username) {
      url += `?user=${encodeURIComponent(route.username)}&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "search") {
      const q = route.query || "";
      const tab = route.tab || "all";
      const searchSort = tab === "popular" ? "hot" : sort;
      url += `?q=${encodeURIComponent(q)}&tab=${encodeURIComponent(tab)}&sort=${encodeURIComponent(searchSort)}`;
    } else if (sort && sort !== "new") {
      url += `?sort=${encodeURIComponent(sort)}`;
    }

    const res = await fetch(url, { headers: hubHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't load Community. Try again.");
    me = data.me || null;
    publicUsername = (me && me.publicUsername) || "";
    displayName = (me && me.displayName) || "";
    photoUrl = (me && me.photoUrl) || "";
    avatarUrl = (me && me.avatarUrl) || "";
    bio = (me && me.bio) || "";
    dmPolicy = (me && me.dmPolicy) || "friends";
    alts = (me && me.alts) || [];
    myTags = (me && me.tags) || [];
    tags = data.tags || [];
    groups = data.groups || groups || [];
    staff = data.staff || [];
    ownerUsername = data.ownerUsername || "vision";
    if (typeof data.unreadCount === "number") unreadCount = data.unreadCount;
    if (data.group && typeof data.group.joined === "boolean") {
      activeGroupJoined = !!data.group.joined;
    }
    if (data.group) activeGroupDetail = data.group;
    if (data.channel && data.channel.slug) activeChannelSlug = data.channel.slug;
    updateInboxBadge();
    applyUsernameState();
    applyStaffState();
    setupActAsBanner();
    if (route.type !== "inbox") renderGroups();
    renderMyTags();

    if (route.type === "groups") {
      renderGroupsPage();
    }
    if (route.type === "inbox") {
      setInboxTab(inboxTab);
      if (inboxTab === "messages") {
        loadDmThreads().catch(() => {});
      }
      if (!Array.isArray(data.groups) || !data.groups.length) {
        try {
          const baseRes = await fetch("/api/synk-community?feed=home", { headers: hubHeaders() });
          const base = await baseRes.json().catch(() => ({}));
          if (baseRes.ok) {
            groups = base.groups || groups || [];
            if (base.me) {
              me = base.me;
              publicUsername = (me && me.publicUsername) || publicUsername;
              alts = (me && me.alts) || alts;
              myTags = (me && me.tags) || myTags;
            }
            if (base.staff) staff = base.staff;
            if (base.tags) tags = base.tags;
            applyStaffState();
          }
        } catch (_) {}
      }
      applyUsernameState();
      renderGroups();
      applyViewState(data);
      renderInbox(data.notifications || []);
      renderNotifPanel(data.notifications || []);
      notifLoaded = true;
      return;
    }

    if (route.type === "post") {
      const post = data.post || (data.posts && data.posts[0]) || null;
      lastPosts = post ? [post] : [];
      lastComments = data.comments || [];
      applyViewState(data);
      renderPostDetail(post);
      renderComments(lastComments);
      return;
    }

    applyViewState(data);
    if (route.type === "settings" || route.type === "submit" || route.type === "mod") {
      return;
    }
    if (route.type === "search") {
      renderSearchResults(data);
      return;
    }
    syncSearchTabs();
    renderFeed(data.posts || []);
  }

  personaBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = personaMenu.hidden;
    personaMenu.hidden = !open;
    personaBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  personaMenu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-persona]");
    if (!item) return;
    storePersona(item.getAttribute("data-persona") || "");
    closePersonaMenu();
  });

  document.addEventListener("click", (e) => {
    if (!personaSwitch.contains(e.target)) closePersonaMenu();
  });

  groupList.addEventListener("click", (e) => {
    const link = e.target.closest("[data-group]");
    if (!link) return;
    e.preventDefault();
    navigate({ type: "group", slug: link.getAttribute("data-group") || "", username: "" }).catch((err) => {
      document.getElementById("post-status").textContent = err.message || "Could not open group";
    });
  });

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate({ type: "home", slug: "", username: "" }).catch(() => {});
  });

  feedEl.addEventListener("click", (e) => {
    const groupLink = e.target.closest('a[href^="/community/group/"], a[href^="/community/g/"]');
    const userLink = e.target.closest('a[href^="/user/"], a[href^="/u/"], a[href^="/community/u/"]');
    if (groupLink) {
      e.preventDefault();
      navigate({
        type: "group",
        slug: groupLink.getAttribute("href").split("/").pop(),
        username: "",
      }).catch(() => {});
      return;
    }
    if (userLink) {
      e.preventDefault();
      navigate({
        type: "user",
        slug: "",
        username: userLink.getAttribute("href").split("/").pop(),
      }).catch(() => {});
    }
  });

  if (communityMain) {
    communityMain.addEventListener("click", (e) => {
      if (feedEl && feedEl.contains(e.target)) return;
      const groupLink = e.target.closest('a[href^="/community/group/"], a[href^="/community/g/"]');
      const userLink = e.target.closest('a[href^="/user/"], a[href^="/u/"], a[href^="/community/u/"]');
      if (groupLink) {
        e.preventDefault();
        navigate({
          type: "group",
          slug: decodeURIComponent(groupLink.getAttribute("href").split("/").pop() || ""),
          username: "",
        }).catch(() => {});
        return;
      }
      if (userLink) {
        e.preventDefault();
        navigate({
          type: "user",
          slug: "",
          username: decodeURIComponent(userLink.getAttribute("href").split("/").pop() || ""),
        }).catch(() => {});
      }
    });
  }

  const myProfileLinkEl = document.getElementById("my-profile-link");
  if (myProfileLinkEl) {
    myProfileLinkEl.addEventListener("click", (e) => {
      const href = myProfileLinkEl.getAttribute("href") || "";
      if (!href.startsWith("/user/") && !href.startsWith("/u/")) return;
      e.preventDefault();
      closeUserMenu();
      navigate({
        type: "user",
        slug: "",
        username: decodeURIComponent(href.split("/").pop() || ""),
      }).catch(() => {});
    });
  }

  if (crumbsEl) {
    crumbsEl.addEventListener("click", (e) => {
      const home = e.target.closest('a[href="/community"]');
      if (!home) return;
      e.preventDefault();
      navigate({ type: "home", slug: "", username: "" }).catch(() => {});
    });
  }

  document.getElementById("jump-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = String(document.getElementById("jump-input").value || "").trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (lower.startsWith("g/") || lower.startsWith("r/")) {
      navigate({ type: "group", slug: lower.slice(2).replace(/[^a-z0-9-]/g, ""), username: "" });
      return;
    }
    if (lower.startsWith("u/") || lower.startsWith("@")) {
      navigate({
        type: "user",
        slug: "",
        username: lower.replace(/^u\//, "").replace(/^@/, "").replace(/[^a-z0-9_]/g, ""),
      });
      return;
    }
    navigate({ type: "search", slug: "", username: "", query: raw, tab: "all" }).catch(() => {});
  })

  const searchTabsEl = document.getElementById("search-tabs");
  if (searchTabsEl) {
    searchTabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-search-tab]");
      if (!btn || route.type !== "search") return;
      const tab = btn.getAttribute("data-search-tab") || "all";
      if (tab === (route.tab || "all")) return;
      navigate({
        type: "search",
        slug: "",
        username: "",
        query: route.query || "",
        tab,
      }).catch(() => {});
    });
  }


  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeReleaseNotesModal();
  });

  window.addEventListener("popstate", () => {
    route = parseRoute();
    loadCommunity().catch(() => {});
  });

  async function saveUsername(username, statusEl) {
    statusEl.textContent = "Saving…";
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: hubHeaders(),
      body: JSON.stringify({ action: "set-username", username }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't save. Try again. username");
    publicUsername = data.publicUsername;
    storePersona(publicUsername);
    statusEl.textContent = "Saved";
    await loadCommunity();
  }

  document.getElementById("settings-link").addEventListener("click", (e) => {
    e.preventDefault();
    navigate({ type: "settings", slug: "", username: "" }).catch(() => {});
  });

  document.getElementById("settings-username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("settings-username-status");
    try {
      await saveUsername(document.getElementById("settings-username").value, status);
    } catch (err) {
      status.textContent = err.message || "Couldn't save. Try again.";
    }
  });


  async function uploadSettingsImage({ fileInput, statusEl, action, extra = {}, onSuccess }) {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    if (statusEl) statusEl.textContent = "Uploading…";
    try {
      if (file.size > 3.5 * 1024 * 1024) throw new Error("Image too large (max ~3.5MB)");
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action, imageData: dataUrl, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (typeof onSuccess === "function") onSuccess(data);
      if (statusEl) statusEl.textContent = "Saved";
      await loadCommunity();
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Upload failed";
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  const avatarBtn = document.getElementById("settings-avatar-btn");
  const avatarFile = document.getElementById("settings-avatar-file");
  const avatarClearBtn = document.getElementById("settings-avatar-clear-btn");
  if (avatarBtn && avatarFile) {
    avatarBtn.addEventListener("click", () => avatarFile.click());
    avatarFile.addEventListener("change", () => {
      uploadSettingsImage({
        fileInput: avatarFile,
        statusEl: document.getElementById("settings-avatar-status"),
        action: "set-avatar",
        extra: { username: activePersona || publicUsername },
        onSuccess: (data) => {
          const savedFor = String(data.username || activePersona || publicUsername).trim().toLowerCase();
          const next = data.avatarUrl || "";
          if (savedFor === publicUsername) {
            avatarUrl = next;
            if (me) me.avatarUrl = next;
          } else {
            alts = (alts || []).map((alt) =>
              alt.username === savedFor ? { ...alt, avatarUrl: next } : alt
            );
            if (me) me.alts = alts;
          }
        },
      });
    });
  }
  if (avatarClearBtn) {
    avatarClearBtn.addEventListener("click", async () => {
      const status = document.getElementById("settings-avatar-status");
      if (status) status.textContent = "Removing…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({
            action: "set-avatar",
            clear: true,
            username: activePersona || publicUsername,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not remove");
        const savedFor = String(data.username || activePersona || publicUsername).trim().toLowerCase();
        if (savedFor === publicUsername) {
          avatarUrl = "";
          if (me) me.avatarUrl = "";
        } else {
          alts = (alts || []).map((alt) =>
            alt.username === savedFor ? { ...alt, avatarUrl: "" } : alt
          );
          if (me) me.alts = alts;
        }
        if (status) status.textContent = "Removed";
        await loadCommunity();
      } catch (err) {
        if (status) status.textContent = err.message || "Could not remove";
      }
    });
  }

  const displayForm = document.getElementById("settings-display-form");
  if (displayForm) {
    displayForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("settings-display-status");
      const input = document.getElementById("settings-display-name");
      if (status) status.textContent = "Saving…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({
            action: "set-display-name",
            displayName: input ? input.value : "",
            username: activePersona || publicUsername,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't save. Try again. display name");
        if (data.me) {
          me = data.me;
          publicUsername = (me && me.publicUsername) || publicUsername;
          displayName = (me && me.displayName) || "";
          alts = (me && me.alts) || [];
          myTags = (me && me.tags) || myTags;
        } else {
          const savedFor = String(data.username || activePersona || publicUsername)
            .trim()
            .toLowerCase();
          const savedName = data.displayName || "";
          if (savedFor === publicUsername) {
            displayName = savedName;
            if (me) me.displayName = savedName;
          } else {
            alts = (alts || []).map((alt) =>
              alt.username === savedFor ? { ...alt, displayName: savedName } : alt
            );
            if (me) me.alts = alts;
          }
        }
        if (status) status.textContent = "Saved";
        applyUsernameState();
        await loadCommunity();
      } catch (err) {
        if (status) status.textContent = err.message || "Couldn't save. Try again.";
      }
    });
  }

  document.getElementById("username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("username-status");
    try {
      await saveUsername(document.getElementById("public-username").value, status);
    } catch (err) {
      status.textContent = err.message || "Couldn't save. Try again.";
    }
  });

  document.getElementById("post-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("post-status");
    status.textContent = "Posting…";
    try {
      const title = String((document.getElementById("post-title") || {}).value || "").trim();
      const body = String((document.getElementById("post-body") || {}).value || "").trim();
      const type = activeSubmitType || "text";
      if (!title || title.length < 2) throw new Error("Title needs at least 2 characters");

      const payload = {
        action: "post",
        type,
        title,
        group: postGroup.value || route.slug || "synk",
        asUsername: activePersona || publicUsername,
      };
      const channelPref =
        (new URLSearchParams(location.search).get("channel") || "").trim().toLowerCase() ||
        activeChannelSlug ||
        "";
      if (channelPref) payload.channel = channelPref;

      if (type === "text") {
        if (!body) throw new Error("Write some text for your post");
        payload.body = body;
      } else if (type === "link") {
        const linkUrl = String((document.getElementById("post-link-url") || {}).value || "").trim();
        if (!/^https?:\/\//i.test(linkUrl)) throw new Error("Enter a valid http(s) link");
        payload.linkUrl = linkUrl;
        payload.body = body;
      } else if (type === "image") {
        let imageUrl = String((document.getElementById("post-image-url") || {}).value || "").trim();
        const fileInput = document.getElementById("post-image-file");
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (file) imageUrl = await readFileAsDataUrl(file);
        if (!imageUrl) throw new Error("Add an image URL or upload a file");
        payload.imageUrl = imageUrl;
        payload.body = body;
      } else if (type === "poll") {
        const raw = String((document.getElementById("post-poll-options") || {}).value || "");
        const pollOptions = raw
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (pollOptions.length < 2) throw new Error("Add at least 2 poll options");
        if (pollOptions.length > 6) throw new Error("Polls support up to 6 options");
        payload.pollOptions = pollOptions;
        payload.body = body;
      }

      const data = await communityAction(payload);
      document.getElementById("post-body").value = "";
      const titleEl = document.getElementById("post-title");
      if (titleEl) titleEl.value = "";
      const linkEl = document.getElementById("post-link-url");
      if (linkEl) linkEl.value = "";
      const imageEl = document.getElementById("post-image-url");
      if (imageEl) imageEl.value = "";
      const fileEl = document.getElementById("post-image-file");
      if (fileEl) fileEl.value = "";
      const pollEl = document.getElementById("post-poll-options");
      if (pollEl) pollEl.value = "";
      status.textContent = "Posted";
      if (data.post && data.post.id) {
        await navigate(
          { type: "post", slug: "", username: "", postId: String(data.post.id) },
          { replace: true }
        );
      } else if (data.post && data.post.group && data.post.group.slug) {
        await navigate({ type: "group", slug: data.post.group.slug, username: "" }, { replace: true });
      } else {
        await loadCommunity();
      }
    } catch (err) {
      status.textContent = err.message || "Could not post";
    }
  });

  const commentForm = document.getElementById("comment-form");
  if (commentForm) {
    commentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("comment-status");
      const bodyEl = document.getElementById("comment-body");
      const body = String((bodyEl && bodyEl.value) || "").trim();
      if (!route.postId) return;
      if (status) status.textContent = "Posting…";
      try {
        await communityAction({
          action: "comment",
          postId: route.postId,
          body,
          asUsername: activePersona || publicUsername,
        });
        if (bodyEl) bodyEl.value = "";
        if (status) status.textContent = "Commented";
        await loadCommunity();
      } catch (err) {
        if (status) status.textContent = err.message || "Could not comment";
      }
    });
  }

  const inboxMarkRead = document.getElementById("inbox-mark-read");
  if (inboxMarkRead) {
    inboxMarkRead.addEventListener("click", async () => {
      try {
        const data = await communityAction({ action: "mark-read" });
        if (typeof data.unreadCount === "number") unreadCount = data.unreadCount;
        else unreadCount = 0;
        updateInboxBadge();
        if (Array.isArray(data.notifications)) {
          renderInbox(data.notifications);
        } else {
          lastNotifications = (lastNotifications || []).map((n) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          }));
          renderInbox(lastNotifications);
        }
      } catch (_) {}
    });
  }

  document.getElementById("create-group-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("group-status");
    status.textContent = "Creating…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "create-group",
          name: document.getElementById("group-name").value,
          slug: String(document.getElementById("group-slug").value || "")
            .trim()
            .replace(/^g\//i, ""),
          description: document.getElementById("group-description").value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create group");
      document.getElementById("group-name").value = "";
      document.getElementById("group-slug").value = "";
      document.getElementById("group-description").value = "";
      status.textContent = `Created ${data.group.slug}`;
      await navigate({ type: "group", slug: data.group.slug, username: "" });
    } catch (err) {
      status.textContent = err.message || "Could not create group";
    }
  });

  document.getElementById("add-admin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("admin-status");
    status.textContent = "Adding…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "add-admin",
          username: document.getElementById("admin-username").value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not add admin");
      document.getElementById("admin-username").value = "";
      staff = data.staff || [];
      renderStaff();
      status.textContent = "Admin added";
    } catch (err) {
      status.textContent = err.message || "Could not add admin";
    }
  });

  staffList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove-admin]");
    if (!btn) return;
    const username = btn.getAttribute("data-remove-admin");
    const status = document.getElementById("admin-status");
    status.textContent = "Removing…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action: "remove-admin", username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove admin");
      staff = data.staff || [];
      renderStaff();
      status.textContent = "Admin removed";
    } catch (err) {
      status.textContent = err.message || "Could not remove admin";
    }
  });

  document.getElementById("create-alt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("alt-status");
    status.textContent = "Creating…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "create-alt",
          username: document.getElementById("alt-username").value,
          label: document.getElementById("alt-label").value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create alt");
      document.getElementById("alt-username").value = "";
      document.getElementById("alt-label").value = "";
      alts = data.alts || [];
      if (me) me.alts = alts;
      renderAlts();
      syncPersonaUi();
      status.textContent = `Created ${data.alt.username}`;
    } catch (err) {
      status.textContent = err.message || "Could not create alt";
    }
  });

  altList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-delete-alt]");
    if (!btn) return;
    const username = btn.getAttribute("data-delete-alt");
    const status = document.getElementById("alt-status");
    status.textContent = "Deleting…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action: "delete-alt", username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete alt");
      alts = data.alts || [];
      if (me) me.alts = alts;
      if (activePersona === username) storePersona(publicUsername);
      renderAlts();
      syncPersonaUi();
      status.textContent = "Alt deleted";
    } catch (err) {
      status.textContent = err.message || "Could not delete alt";
    }
  });


  document.getElementById("create-tag-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("tag-status");
    status.textContent = "Creating…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "create-tag",
          name: document.getElementById("tag-name").value,
          description: document.getElementById("tag-description").value,
          color: document.getElementById("tag-color").value,
          iconData: pendingTagIconData || undefined,
          learnMoreEnabled: !!(document.getElementById("tag-learn-more-enabled") && document.getElementById("tag-learn-more-enabled").checked),
          learnMorePageId: (document.getElementById("tag-learn-more-page") && document.getElementById("tag-learn-more-page").value) || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create tag");
      document.getElementById("tag-name").value = "";
      document.getElementById("tag-description").value = "";
      const learnEn = document.getElementById("tag-learn-more-enabled");
      const learnPage = document.getElementById("tag-learn-more-page");
      const learnWrap = document.getElementById("tag-learn-more-page-wrap");
      if (learnEn) learnEn.checked = false;
      if (learnPage) learnPage.value = "";
      if (learnWrap) learnWrap.hidden = true;
      const iconInput = document.getElementById("tag-icon");
      if (iconInput) iconInput.value = "";
      pendingTagIconData = "";
      const iconPreview = document.getElementById("tag-icon-preview");
      if (iconPreview) {
        iconPreview.hidden = true;
        iconPreview.innerHTML = "";
      }
      tags = data.tags || [];
      renderTagCatalog();
      status.textContent = `Created ${data.tag.name}`;
    } catch (err) {
      status.textContent = err.message || "Could not create tag";
    }
  });

  document.getElementById("assign-tag-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("assign-tag-status");
    status.textContent = "Assigning…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "assign-tag",
          username: document.getElementById("assign-tag-username").value,
          tagId: document.getElementById("assign-tag-id").value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not assign tag");
      document.getElementById("assign-tag-username").value = "";
      status.textContent = `Tagged ${data.username}`;
      await loadCommunity();
    } catch (err) {
      status.textContent = err.message || "Could not assign tag";
    }
  });

  const tagIconInput = document.getElementById("tag-icon");
  const tagIconPreview = document.getElementById("tag-icon-preview");
  if (tagIconInput) {
    tagIconInput.addEventListener("change", async () => {
      const status = document.getElementById("tag-status");
      try {
        const file = tagIconInput.files && tagIconInput.files[0];
        if (!file) {
          pendingTagIconData = "";
          if (tagIconPreview) {
            tagIconPreview.hidden = true;
            tagIconPreview.innerHTML = "";
          }
          return;
        }
        if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file");
        if (file.size > 512 * 1024) throw new Error("Icon too large (max 512KB)");
        pendingTagIconData = await readFileAsDataUrl(file);
        if (tagIconPreview) {
          tagIconPreview.hidden = false;
          tagIconPreview.innerHTML = `<img src="${pendingTagIconData}" alt="" />`;
        }
        if (status) status.textContent = "Icon ready";
      } catch (err) {
        pendingTagIconData = "";
        tagIconInput.value = "";
        if (tagIconPreview) {
          tagIconPreview.hidden = true;
          tagIconPreview.innerHTML = "";
        }
        if (status) status.textContent = err.message || "Could not read icon";
      }
    });
  }

  const tagIconFile = document.getElementById("tag-icon-file");
  let tagIconUploadId = "";
  if (tagIconFile) {
    tagIconFile.addEventListener("change", async () => {
      const status = document.getElementById("tag-status");
      const tagId = tagIconUploadId;
      tagIconUploadId = "";
      if (!tagId) return;
      if (status) status.textContent = "Uploading icon…";
      try {
        const file = tagIconFile.files && tagIconFile.files[0];
        tagIconFile.value = "";
        if (!file) throw new Error("Choose an image");
        if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file");
        if (file.size > 512 * 1024) throw new Error("Icon too large (max 512KB)");
        const iconData = await readFileAsDataUrl(file);
        if (!iconData) throw new Error("Choose an image");
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({ action: "update-tag", tagId, iconData }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not upload icon");
        tags = data.tags || [];
        renderTagCatalog();
        await loadCommunity();
        if (status) status.textContent = "Icon updated";
      } catch (err) {
        tagIconFile.value = "";
        if (status) status.textContent = err.message || "Could not upload icon";
      }
    });
  }

  if (tagCatalog) {
    tagCatalog.addEventListener("click", async (e) => {
      const editBtn = e.target.closest("[data-edit-tag]");
      if (editBtn) {
        e.preventDefault();
        const row = editBtn.closest(".synk-tag-mod-item");
        if (!row) return;
        const panel = row.querySelector(".synk-tag-mod-edit-panel");
        const opening = !panel || panel.hidden;
        tagCatalog.querySelectorAll(".synk-tag-mod-item").forEach((item) => {
          const otherPanel = item.querySelector(".synk-tag-mod-edit-panel");
          const otherEdit = item.querySelector("[data-edit-tag]");
          if (otherPanel) otherPanel.hidden = true;
          if (otherEdit) {
            otherEdit.hidden = false;
            otherEdit.setAttribute("aria-expanded", "false");
          }
        });
        if (panel && opening) {
          panel.hidden = false;
          editBtn.hidden = true;
          editBtn.setAttribute("aria-expanded", "true");
        }
        return;
      }
      const doneBtn = e.target.closest("[data-edit-tag-done]");
      if (doneBtn) {
        e.preventDefault();
        const row = doneBtn.closest(".synk-tag-mod-item");
        if (!row) return;
        const panel = row.querySelector(".synk-tag-mod-edit-panel");
        const edit = row.querySelector("[data-edit-tag]");
        if (panel) panel.hidden = true;
        if (edit) {
          edit.hidden = false;
          edit.setAttribute("aria-expanded", "false");
        }
        return;
      }
      const saveLearnBtn = e.target.closest("[data-save-tag-learn]");
      if (saveLearnBtn) {
        e.preventDefault();
        const tagId = saveLearnBtn.getAttribute("data-save-tag-learn");
        const row = saveLearnBtn.closest(".synk-tag-mod-item");
        const enabledEl = row && row.querySelector(`[data-tag-learn-enabled="${tagId}"]`);
        const pageEl = row && row.querySelector(`[data-tag-learn-page="${tagId}"]`);
        const status = document.getElementById("tag-status");
        if (status) status.textContent = "Saving Learn more…";
        try {
          const res = await fetch("/api/synk-community", {
            method: "POST",
            headers: hubHeaders(),
            body: JSON.stringify({
              action: "update-tag",
              tagId,
              learnMoreEnabled: !!(enabledEl && enabledEl.checked),
              learnMorePageId: (pageEl && pageEl.value) || null,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Could not update tag");
          tags = data.tags || [];
          renderTagCatalog();
          if (status) status.textContent = "Learn more updated";
          await loadCommunity();
        } catch (err) {
          if (status) status.textContent = err.message || "Could not update tag";
        }
        return;
      }
      const uploadBtn = e.target.closest("[data-upload-tag-icon]");
      if (uploadBtn) {
        e.preventDefault();
        tagIconUploadId = uploadBtn.getAttribute("data-upload-tag-icon") || "";
        if (tagIconFile) tagIconFile.click();
        return;
      }
      const clearBtn = e.target.closest("[data-clear-tag-icon]");
      if (clearBtn) {
        e.preventDefault();
        const tagId = clearBtn.getAttribute("data-clear-tag-icon");
        const status = document.getElementById("tag-status");
        if (status) status.textContent = "Clearing icon…";
        try {
          const res = await fetch("/api/synk-community", {
            method: "POST",
            headers: hubHeaders(),
            body: JSON.stringify({ action: "update-tag", tagId, clearIcon: true }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Could not clear icon");
          tags = data.tags || [];
          renderTagCatalog();
          await loadCommunity();
          if (status) status.textContent = "Icon cleared";
        } catch (err) {
          if (status) status.textContent = err.message || "Could not clear icon";
        }
        return;
      }
      const btn = e.target.closest("[data-delete-tag]");
      if (!btn) return;
      const tagId = btn.getAttribute("data-delete-tag");
      const status = document.getElementById("tag-status");
      status.textContent = "Deleting…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({ action: "delete-tag", tagId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not delete tag");
        tags = data.tags || [];
        renderTagCatalog();
        status.textContent = "Tag deleted";
        await loadCommunity();
      } catch (err) {
        status.textContent = err.message || "Could not delete tag";
      }
    });
  }

  async function pinTagById(tagId, { clear } = {}) {
    if (!tagId) return;
    const status = document.getElementById("my-tags-status");
    if (status) status.textContent = "Updating…";
    try {
      const liveTags = tagsForActivePersona();
      const currentlyPinned =
        typeof clear === "boolean"
          ? clear
          : !!(liveTags.find((tag) => String(tag.id) === String(tagId) && tag.pinned) ||
              myTags.find((tag) => String(tag.id) === String(tagId) && tag.pinned));
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify(
          currentlyPinned
            ? {
                action: "pin-tag",
                clear: true,
                asUsername: activePersona || publicUsername,
              }
            : {
                action: "pin-tag",
                tagId,
                asUsername: activePersona || publicUsername,
              }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again. pin");
      if (data.me) me = data.me;
      myTags = (data.tags || (me && me.tags) || []).map((tag) => ({
        ...tag,
        pinned: !!(data.pinnedTag && data.pinnedTag.id === tag.id),
      }));
      if (me) {
        const pinUser = data.username || activePersona || publicUsername;
        if (pinUser === publicUsername) {
          me.tags = myTags;
          me.pinnedTag = data.pinnedTag || null;
        } else if (Array.isArray(me.alts)) {
          me.alts = me.alts.map((alt) =>
            alt.username === pinUser
              ? { ...alt, tags: myTags, pinnedTag: data.pinnedTag || null }
              : alt
          );
          alts = me.alts;
        }
      }
      closeTagPopover();
      renderMyTags();
      await loadCommunity();
      if (status) status.textContent = data.pinnedTag ? `Pinned ${data.pinnedTag.name}` : "Pin cleared";
    } catch (err) {
      if (status) status.textContent = err.message || "Something went wrong. Try again. pin";
    }
  }

  async function handlePinClick(e) {
    const btn = e.target.closest("[data-pin-tag]");
    if (!btn || btn.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    const clearAttr = btn.getAttribute("data-tag-pinned");
    await pinTagById(btn.getAttribute("data-pin-tag"), {
      clear: clearAttr == null ? undefined : clearAttr === "1",
    });
  }

  document.addEventListener("click", (e) => {
    const pinFromPop = e.target.closest("#tag-pop-pin");
    if (pinFromPop) {
      e.preventDefault();
      e.stopPropagation();
      if (pinFromPop.hidden || !pinFromPop.getAttribute("data-pin-tag")) return;
      pinTagById(pinFromPop.getAttribute("data-pin-tag"), {
        clear: pinFromPop.getAttribute("data-tag-pinned") === "1",
      }).catch(() => {});
      return;
    }
    const badge = e.target.closest("[data-tag-badge]");
    if (badge) {
      e.preventDefault();
      e.stopPropagation();
      if (badge.getAttribute("aria-expanded") === "true") {
        closeTagPopover();
      } else {
        openTagPopover(badge);
      }
      return;
    }
    if (!e.target.closest("#tag-badge-popover")) {
      closeTagPopover();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTagPopover();
  });

  if (myTagsList) myTagsList.addEventListener("click", handlePinClick);
  if (profileMeta) profileMeta.addEventListener("click", handlePinClick);

  
  const composerOpenBtn = document.getElementById("composer-open-btn");
  const composerCancelBtn = document.getElementById("composer-cancel-btn");
  if (composerOpenBtn) {
    composerOpenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setComposerOpen(true);
    });
  }
  if (composerCancelBtn) {
    composerCancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const st = document.getElementById("post-status");
      if (st) st.textContent = "";
      navigate({ type: "home", slug: "", username: "" }).catch(() => {});
    });
  }

  function bindNav(el, nextFactory) {
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeUserMenu();
      const next = typeof nextFactory === "function" ? nextFactory() : nextFactory;
      navigate(next).catch(() => {});
    });
  }
  bindNav(popularLink, { type: "popular", slug: "", username: "" });
  bindNav(document.getElementById("brand-home"), { type: "home", slug: "", username: "" });
  bindNav(document.getElementById("settings-nav-link"), { type: "settings", slug: "", username: "" });
  bindNav(document.getElementById("submit-nav-link"), { type: "submit", slug: "", username: "" });
  bindNav(document.getElementById("create-top-link"), { type: "submit", slug: "", username: "" });
  bindNav(document.getElementById("mod-nav-link"), { type: "mod", slug: "", username: "" });
  bindNav(document.getElementById("mod-menu-link"), { type: "mod", slug: "", username: "" });

  // Reddit-style bottom tabs (mobile)
  bindNav(document.getElementById("tab-home"), { type: "home", slug: "", username: "" });
  bindNav(document.getElementById("tab-popular"), { type: "popular", slug: "", username: "" });
  bindNav(document.getElementById("tab-create"), { type: "submit", slug: "", username: "" });
  bindNav(document.getElementById("tab-inbox"), { type: "inbox", slug: "", username: "" });

  bindNav(document.getElementById("groups-nav-link"), { type: "groups", slug: "", username: "" });
  const notificationsNav = document.getElementById("notifications-nav-link");
  if (notificationsNav) {
    notificationsNav.addEventListener("click", (e) => {
      e.preventDefault();
      openNotifications().catch(() => {});
    });
  }
  const messagesNav = document.getElementById("messages-nav-link");
  if (messagesNav) {
    messagesNav.addEventListener("click", (e) => {
      e.preventDefault();
      openMessages().catch(() => {});
    });
  }
  const menuProfileLink = document.getElementById("menu-profile-link");
  if (menuProfileLink) {
    menuProfileLink.addEventListener("click", (e) => {
      if (!publicUsername) return;
      e.preventDefault();
      navigate({ type: "user", slug: "", username: publicUsername }).catch(() => {});
    });
  }
  const menuSignout = document.getElementById("menu-signout-btn");
  if (menuSignout) {
    menuSignout.addEventListener("click", () => {
      const legacy = document.getElementById("signout-btn");
      if (legacy) legacy.click();
      else {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        location.href = "/verify";
      }
    });
  }

  bindNav(document.getElementById("tab-me"), () => ({
    type: "user",
    slug: "",
    username: publicUsername || "",
  }));

  // —— Bio & DM privacy settings ——
  const bioForm = document.getElementById("settings-bio-form");
  if (bioForm) {
    bioForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("settings-bio-status");
      const input = document.getElementById("settings-bio");
      if (status) status.textContent = "Saving…";
      try {
        const data = await communityAction({
          action: "set-bio",
          bio: input ? input.value : "",
          username: activePersona || publicUsername,
        });
        bio = data.bio || "";
        if (me) me.bio = bio;
        if (status) status.textContent = "Saved";
      } catch (err) {
        if (status) status.textContent = err.message || "Couldn't save. Try again. bio";
      }
    });
  }

  const dmForm = document.getElementById("settings-dm-form");
  if (dmForm) {
    dmForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("settings-dm-status");
      const select = document.getElementById("settings-dm-policy");
      if (status) status.textContent = "Saving…";
      try {
        const data = await communityAction({
          action: "set-dm-policy",
          dmPolicy: select ? select.value : "friends",
          username: activePersona || publicUsername,
        });
        dmPolicy = data.dmPolicy || "friends";
        if (me) me.dmPolicy = dmPolicy;
        if (status) status.textContent = "Saved";
      } catch (err) {
        if (status) status.textContent = err.message || "Couldn't save. Try again.";
      }
    });
  }

  async function openNotifications() {
    inboxTab = "notifications";
    await navigate({ type: "inbox", slug: "", username: "" });
    setInboxTab("notifications");
  }

  let dmFriendsCache = [];
  let dmNewOpen = false;

  function setDmChatOpen(open) {
    const shell = document.getElementById("dm-shell");
    if (shell) shell.classList.toggle("is-chat-open", !!open);
  }

  function setDmNewOpen(open) {
    dmNewOpen = !!open;
    const panel = document.getElementById("dm-new-panel");
    const btn = document.getElementById("dm-new-btn");
    if (panel) panel.hidden = !dmNewOpen;
    if (btn) btn.textContent = dmNewOpen ? "Close" : "New";
    if (dmNewOpen) {
      const search = document.getElementById("dm-new-search");
      if (search) {
        search.value = "";
        search.focus();
      }
      renderDmFriends(dmFriendsCache);
    }
  }

  async function openMessages() {
    inboxTab = "messages";
    await navigate({ type: "inbox", slug: "", username: "" });
    setInboxTab("messages");
    setDmChatOpen(!!activeDmUser);
    try {
      await loadDmThreads();
      if (activeDmUser) await openDmThread(activeDmUser);
    } catch (_) {}
  }

  async function openDmWith(username) {
    const target = String(username || "").trim().toLowerCase();
    if (!target) return;
    inboxTab = "messages";
    activeDmUser = target;
    await navigate({ type: "inbox", slug: "", username: "" });
    setInboxTab("messages");
    await loadDmThreads();
    await openDmThread(target);
  }

  function setInboxTab(tab) {
    inboxTab = tab === "messages" ? "messages" : "notifications";
    const notifPane = document.getElementById("inbox-notifications-pane");
    const msgPane = document.getElementById("inbox-messages-pane");
    const notifTab = document.getElementById("inbox-tab-notifications");
    const msgTab = document.getElementById("inbox-tab-messages");
    if (notifPane) notifPane.hidden = inboxTab !== "notifications";
    if (msgPane) msgPane.hidden = inboxTab !== "messages";
    if (notifTab) notifTab.classList.toggle("is-active", inboxTab === "notifications");
    if (msgTab) msgTab.classList.toggle("is-active", inboxTab === "messages");
    const markRead = document.getElementById("inbox-mark-read");
    if (markRead) markRead.hidden = inboxTab !== "notifications";
    const messagesNavLink = document.getElementById("messages-nav-link");
    if (messagesNavLink) messagesNavLink.classList.toggle("is-active", inboxTab === "messages");
    const notificationsNavLink = document.getElementById("notifications-nav-link");
    if (notificationsNavLink) notificationsNavLink.classList.toggle("is-active", inboxTab === "notifications");
    if (inboxTab !== "messages") {
      setDmNewOpen(false);
      setDmChatOpen(false);
    } else {
      setDmChatOpen(!!activeDmUser);
    }
  }

  function renderDmThreads(threads) {
    dmThreads = Array.isArray(threads) ? threads : [];
    const list = document.getElementById("dm-thread-list");
    const empty = document.getElementById("dm-thread-empty");
    if (!list) return;
    if (!dmThreads.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = dmThreads
      .map((t) => {
        const other = t.otherUser || t.otherUsername || "";
        const active = other === activeDmUser ? "is-active" : "";
        const preview = escapeHtml(t.lastBody || t.preview || "No messages yet");
        const when = escapeHtml(formatWhen(t.lastMessageAt || t.updatedAt || t.createdAt));
        const label = escapeHtml(t.otherDisplayName || other);
        const handle = escapeHtml(other ? `@${other}` : "");
        const avatar = avatarMarkup(t.otherAvatarUrl || "", t.otherDisplayName || other, "community-face community-dm-avatar");
        return `<button type="button" class="community-dm-thread ${active}" data-dm-user="${escapeHtml(other)}" role="listitem">
          ${avatar}
          <span class="community-dm-thread-copy">
            <span class="community-dm-thread-top"><strong>${label}</strong><span>${when}</span></span>
            <span class="community-dm-thread-handle">${handle}</span>
            <span class="community-dm-thread-preview">${preview}</span>
          </span>
        </button>`;
      })
      .join("");
  }

  function renderDmFriends(friends, query = "") {
    const list = document.getElementById("dm-friend-list");
    const empty = document.getElementById("dm-friend-empty");
    if (!list) return;
    const q = String(query || "").trim().toLowerCase();
    const rows = (Array.isArray(friends) ? friends : []).filter((f) => {
      const username = String(f.username || "").toLowerCase();
      const display = String(f.displayName || "").toLowerCase();
      if (!q) return true;
      return username.includes(q) || display.includes(q);
    });
    if (!rows.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = rows
      .map((f) => {
        const username = String(f.username || "").trim();
        const label = escapeHtml(f.displayName || username);
        const handle = escapeHtml(username ? `@${username}` : "");
        const avatar = avatarMarkup(f.avatarUrl || "", f.displayName || username, "community-face community-dm-avatar");
        return `<button type="button" class="community-dm-friend" data-dm-friend="${escapeHtml(username)}" role="option">
          ${avatar}
          <span><strong>${label}</strong><span class="muted">${handle}</span></span>
        </button>`;
      })
      .join("");
  }

  async function loadDmFriends() {
    const data = await communityAction({ action: "dm-friends" });
    dmFriendsCache = Array.isArray(data.friends) ? data.friends : [];
    renderDmFriends(dmFriendsCache, (document.getElementById("dm-new-search") || {}).value || "");
    return dmFriendsCache;
  }

  function clearDmEditMode() {
    editingDmMessageId = "";
    const input = document.getElementById("dm-compose-input");
    const cancel = document.getElementById("dm-compose-cancel");
    const sendBtn = document.getElementById("dm-compose-send");
    if (input) {
      input.placeholder = "Write a message…";
      input.removeAttribute("data-editing");
    }
    if (cancel) cancel.hidden = true;
    if (sendBtn) sendBtn.setAttribute("aria-label", "Send");
  }

  function clearDmPressTimer() {
    if (dmPressTimer) {
      clearTimeout(dmPressTimer);
      dmPressTimer = null;
    }
  }

  function closeDmMessageSheet() {
    activeDmSheetMessageId = "";
    const sheet = document.getElementById("dm-msg-sheet");
    if (sheet) sheet.hidden = true;
    document.querySelectorAll(".community-dm-msg.is-menu-open").forEach((el) => {
      el.classList.remove("is-menu-open");
    });
  }

  function openDmMessageSheet(messageId) {
    const msg = (activeDmMessages || []).find((m) => String(m.id) === String(messageId));
    if (!msg) return;
    activeDmSheetMessageId = String(msg.id);
    const sheet = document.getElementById("dm-msg-sheet");
    const reacts = document.getElementById("dm-sheet-reacts");
    const actions = document.getElementById("dm-sheet-actions");
    if (!sheet || !reacts || !actions) return;

    document.querySelectorAll(".community-dm-msg.is-menu-open").forEach((el) => {
      el.classList.remove("is-menu-open");
    });
    const wrap = document.querySelector(
      `[data-dm-message-id="${String(msg.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`
    );
    if (wrap) wrap.classList.add("is-menu-open");

    reacts.innerHTML = DM_REACTION_EMOJIS.map(
      (emoji) =>
        `<button type="button" class="community-dm-sheet-emoji" data-dm-react="${escapeHtml(
          String(msg.id)
        )}" data-dm-emoji="${escapeHtml(emoji)}" aria-label="React ${escapeHtml(emoji)}">${emoji}</button>`
    ).join("");

    const actionBtns = [];
    if (msg.canEdit) {
      actionBtns.push(
        `<button type="button" class="community-dm-sheet-action" data-dm-edit="${escapeHtml(
          String(msg.id)
        )}">Edit</button>`
      );
    }
    if (msg.canDelete) {
      const canUnsend = Boolean(msg.canUnsend || msg.deleteMode === "unsend");
      actionBtns.push(
        `<button type="button" class="community-dm-sheet-action is-danger" data-dm-delete="${escapeHtml(
          String(msg.id)
        )}" data-dm-delete-mode="${escapeHtml(
          msg.deleteMode || (canUnsend ? "unsend" : "for-me")
        )}">${canUnsend ? "Delete for everyone" : "Delete for me"}</button>`
      );
    }
    actions.innerHTML = actionBtns.join("");
    sheet.hidden = false;
  }

  async function toggleDmReaction(messageId, emoji) {
    const id = String(messageId || "").trim();
    const reaction = String(emoji || "").trim();
    if (!id || !reaction) return;
    try {
      const data = await communityAction({
        action: "dm-react",
        messageId: id,
        emoji: reaction,
      });
      if (data && data.message) {
        activeDmMessages = (activeDmMessages || []).map((m) =>
          String(m.id) === String(data.message.id) ? data.message : m
        );
        renderDmMessages(activeDmMessages, {
          otherUser: activeDmUser,
          preserveScroll: true,
        });
      } else if (activeDmUser) {
        await openDmThread(activeDmUser);
      }
    } catch (err) {
      showToast(err.message || "Could not react");
    } finally {
      closeDmMessageSheet();
    }
  }

  function startDmEdit(messageId) {
    const msg = (activeDmMessages || []).find((m) => String(m.id) === String(messageId));
    if (!msg || !msg.canEdit) return;
    closeDmMessageSheet();
    editingDmMessageId = String(msg.id);
    const input = document.getElementById("dm-compose-input");
    const cancel = document.getElementById("dm-compose-cancel");
    const sendBtn = document.getElementById("dm-compose-send");
    if (input) {
      input.value = msg.body || "";
      input.placeholder = "Edit message…";
      input.setAttribute("data-editing", "1");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (cancel) cancel.hidden = false;
    if (sendBtn) sendBtn.setAttribute("aria-label", "Save edit");
  }

  function renderDmMessages(messages, { otherUser = "", preserveScroll = false } = {}) {
    const list = document.getElementById("dm-message-list");
    const title = document.getElementById("dm-chat-title");
    const sub = document.getElementById("dm-chat-sub");
    const head = document.getElementById("dm-chat-head");
    const profile = document.getElementById("dm-chat-profile");
    const avatar = document.getElementById("dm-chat-avatar");
    const form = document.getElementById("dm-compose-form");
    const hint = document.getElementById("dm-chat-hint");
    const meName = String(publicUsername || "")
      .trim()
      .toLowerCase();
    const thread = (dmThreads || []).find(
      (t) => String(t.otherUser || t.otherUsername || "").toLowerCase() === String(otherUser || "").toLowerCase()
    );
    const titleLabel = (thread && (thread.otherDisplayName || thread.otherUser)) || otherUser || "Select a conversation";
    if (title) title.textContent = titleLabel;
    if (sub) sub.textContent = otherUser ? `@${otherUser}` : "";
    if (profile) profile.href = otherUser ? `/user/${encodeURIComponent(otherUser)}` : "#";
    if (avatar) paintAvatar(avatar, (thread && thread.otherAvatarUrl) || "", titleLabel);
    if (head) head.hidden = !otherUser;
    if (form) form.hidden = !otherUser;
    if (hint) hint.hidden = !!otherUser;
    setDmChatOpen(!!otherUser);
    if (!list) return;
    const prevScroll = list.scrollTop;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    const rows = Array.isArray(messages) ? messages : [];
    activeDmMessages = rows;
    list.innerHTML = rows
      .map((m) => {
        const sender = String(m.senderUsername || m.sender || "")
          .trim()
          .toLowerCase();
        const mine = Boolean(meName && sender === meName) || Boolean(m.canEdit || m.canUnsend);
        const edited = Boolean(m.isEdited || (m.editHistory && m.editHistory.length));
        const history = Array.isArray(m.editHistory) ? m.editHistory : [];
        const reactions = Array.isArray(m.reactions) ? m.reactions : [];
        const historyHtml = history.length
          ? `<div class="community-dm-history" hidden>
              ${history
                .slice()
                .reverse()
                .map(
                  (h) =>
                    `<div class="community-dm-history-item"><span class="community-dm-history-label">Before edit</span><p>${escapeHtml(
                      h.body || ""
                    )}</p></div>`
                )
                .join("")}
            </div>`
          : "";
        const meta = edited
          ? `<button type="button" class="community-dm-edited" data-dm-history-toggle="${escapeHtml(
              String(m.id || "")
            )}" aria-expanded="false">Edited</button>`
          : "";
        const reactionsHtml = reactions.length
          ? `<div class="community-dm-reactions" aria-label="Reactions">
              ${reactions
                .map(
                  (r) =>
                    `<button type="button" class="community-dm-reaction ${r.me ? "is-mine" : ""}" data-dm-react="${escapeHtml(
                      String(m.id || "")
                    )}" data-dm-emoji="${escapeHtml(r.emoji || "")}" aria-pressed="${
                      r.me ? "true" : "false"
                    }"><span>${escapeHtml(r.emoji || "")}</span><span>${escapeHtml(
                      String(r.count || 1)
                    )}</span></button>`
                )
                .join("")}
            </div>`
          : "";
        const when = m.createdAt
          ? `<time class="community-dm-time" datetime="${escapeHtml(m.createdAt)}">${escapeHtml(
              formatWhen(m.createdAt)
            )}</time>`
          : "";
        return `<div class="community-dm-msg ${mine ? "is-mine" : "is-theirs"}" data-dm-message-id="${escapeHtml(
          String(m.id || "")
        )}">
          <div class="community-dm-bubble ${mine ? "is-mine" : "is-theirs"} ${edited ? "is-edited" : ""}" tabindex="0">
            <div class="community-dm-msg-body">${escapeHtml(m.body || "")}</div>
            ${meta}
            ${historyHtml}
          </div>
          ${reactionsHtml}
          ${when}
        </div>`;
      })
      .join("");
    if (preserveScroll && !nearBottom) list.scrollTop = prevScroll;
    else list.scrollTop = list.scrollHeight;
  }

  async function loadDmThreads() {
    const data = await communityAction({ action: "dm-list" });
    renderDmThreads(data.threads || []);
    return data;
  }

  async function openDmThread(username) {
    const target = String(username || "").trim().toLowerCase();
    if (!target) return;
    activeDmUser = target;
    clearDmEditMode();
    closeDmMessageSheet();
    setDmNewOpen(false);
    const data = await communityAction({ action: "dm-open", username: target });
    activeDmThreadId = (data.thread && data.thread.id) || "";
    if (data.thread) {
      const idx = (dmThreads || []).findIndex(
        (t) => String(t.otherUser || t.otherUsername || "").toLowerCase() === target
      );
      if (idx >= 0) dmThreads[idx] = { ...dmThreads[idx], ...data.thread };
      else dmThreads = [data.thread, ...(dmThreads || [])];
    }
    renderDmThreads(dmThreads);
    renderDmMessages(data.messages || [], { otherUser: target });
    const form = document.getElementById("dm-compose-form");
    if (form) form.hidden = false;
    const input = document.getElementById("dm-compose-input");
    if (input) input.focus();
  }

  document.querySelectorAll("[data-inbox-tab]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      setInboxTab(btn.getAttribute("data-inbox-tab"));
      if (inboxTab === "messages") {
        try {
          await loadDmThreads();
          if (activeDmUser) await openDmThread(activeDmUser);
        } catch (err) {
          showToast(err.message || "Could not load messages");
        }
      }
    });
  });

  const dmThreadList = document.getElementById("dm-thread-list");
  if (dmThreadList) {
    dmThreadList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-dm-user]");
      if (!btn) return;
      openDmThread(btn.getAttribute("data-dm-user")).catch((err) => {
        showToast(err.message || "Could not open chat");
      });
    });
  }

  async function toggleNewMessagePanel() {
    const next = !dmNewOpen;
    setDmNewOpen(next);
    if (next) {
      try {
        await loadDmFriends();
      } catch (err) {
        showToast(err.message || "Could not load friends");
      }
    }
  }

  const dmNewBtn = document.getElementById("dm-new-btn");
  if (dmNewBtn) dmNewBtn.addEventListener("click", () => { toggleNewMessagePanel(); });
  const dmEmptyNewBtn = document.getElementById("dm-empty-new-btn");
  if (dmEmptyNewBtn) dmEmptyNewBtn.addEventListener("click", () => { toggleNewMessagePanel(); });
  const dmBackBtn = document.getElementById("dm-back-btn");
  if (dmBackBtn) {
    dmBackBtn.addEventListener("click", () => {
      activeDmUser = "";
      activeDmThreadId = "";
      clearDmEditMode();
      closeDmMessageSheet();
      renderDmMessages([], { otherUser: "" });
      renderDmThreads(dmThreads);
      setDmChatOpen(false);
    });
  }
  const dmNewSearch = document.getElementById("dm-new-search");
  if (dmNewSearch) {
    dmNewSearch.addEventListener("input", () => {
      renderDmFriends(dmFriendsCache, dmNewSearch.value);
    });
  }
  const dmFriendList = document.getElementById("dm-friend-list");
  if (dmFriendList) {
    dmFriendList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-dm-friend]");
      if (!btn) return;
      openDmThread(btn.getAttribute("data-dm-friend")).catch((err) => {
        showToast(err.message || "Could not open chat");
      });
    });
  }

  const dmCompose = document.getElementById("dm-compose-form");
  if (dmCompose) {
    dmCompose.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("dm-compose-input");
      const body = String((input && input.value) || "").trim();
      if (!body || !activeDmUser) return;
      const sendBtn = document.getElementById("dm-compose-send");
      if (sendBtn) sendBtn.disabled = true;
      try {
        if (editingDmMessageId) {
          await communityAction({
            action: "dm-edit",
            messageId: editingDmMessageId,
            body,
          });
          clearDmEditMode();
          if (input) input.value = "";
          showToast("Message updated");
        } else {
          await communityAction({
            action: "dm-send",
            username: activeDmUser,
            threadId: activeDmThreadId || undefined,
            body,
          });
          if (input) input.value = "";
        }
        await openDmThread(activeDmUser);
        await loadDmThreads();
      } catch (err) {
        showToast(err.message || (editingDmMessageId ? "Could not edit message." : "Message not sent. Try again."));
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
      }
    });
  }

  const dmComposeCancel = document.getElementById("dm-compose-cancel");
  if (dmComposeCancel) {
    dmComposeCancel.addEventListener("click", () => {
      const input = document.getElementById("dm-compose-input");
      clearDmEditMode();
      if (input) {
        input.value = "";
        input.focus();
      }
    });
  }

  async function handleDmDelete(messageId, mode) {
    const confirmText =
      mode === "unsend"
        ? "Delete this message for everyone?"
        : "Delete this message for you only? The other person will still see it.";
    if (!window.confirm(confirmText)) return;
    closeDmMessageSheet();
    try {
      const result = await communityAction({
        action: "dm-delete",
        messageId,
      });
      if (editingDmMessageId && String(editingDmMessageId) === String(messageId)) {
        clearDmEditMode();
        const input = document.getElementById("dm-compose-input");
        if (input) input.value = "";
      }
      showToast(result.mode === "unsend" ? "Message deleted" : "Deleted for you");
      if (activeDmUser) {
        await openDmThread(activeDmUser);
        await loadDmThreads();
      }
    } catch (err) {
      showToast(err.message || "Could not delete message.");
    }
  }

  const dmMessageList = document.getElementById("dm-message-list");
  if (dmMessageList) {
    dmMessageList.addEventListener("click", async (e) => {
      const historyBtn = e.target.closest("[data-dm-history-toggle]");
      if (historyBtn) {
        e.preventDefault();
        const wrap = historyBtn.closest("[data-dm-message-id]");
        const history = wrap && wrap.querySelector(".community-dm-history");
        if (!history) return;
        const open = history.hidden;
        history.hidden = !open;
        historyBtn.setAttribute("aria-expanded", open ? "true" : "false");
        historyBtn.classList.toggle("is-open", open);
        return;
      }

      const reactBtn = e.target.closest("[data-dm-react]");
      if (reactBtn) {
        e.preventDefault();
        await toggleDmReaction(
          reactBtn.getAttribute("data-dm-react"),
          reactBtn.getAttribute("data-dm-emoji")
        );
      }
    });

    dmMessageList.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const msg = e.target.closest("[data-dm-message-id]");
      if (!msg || e.target.closest("[data-dm-react], [data-dm-history-toggle], a, button")) return;
      dmPressMoved = false;
      clearDmPressTimer();
      const id = msg.getAttribute("data-dm-message-id");
      const startX = e.clientX;
      const startY = e.clientY;
      dmPressTimer = setTimeout(() => {
        dmPressTimer = null;
        if (dmPressMoved) return;
        try {
          if (navigator.vibrate) navigator.vibrate(12);
        } catch (_) {}
        openDmMessageSheet(id);
      }, 420);
      const onMove = (ev) => {
        if (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10) {
          dmPressMoved = true;
          clearDmPressTimer();
        }
      };
      const onUp = () => {
        clearDmPressTimer();
        dmMessageList.removeEventListener("pointermove", onMove);
        dmMessageList.removeEventListener("pointerup", onUp);
        dmMessageList.removeEventListener("pointercancel", onUp);
      };
      dmMessageList.addEventListener("pointermove", onMove);
      dmMessageList.addEventListener("pointerup", onUp);
      dmMessageList.addEventListener("pointercancel", onUp);
    });

    dmMessageList.addEventListener("contextmenu", (e) => {
      const msg = e.target.closest("[data-dm-message-id]");
      if (!msg) return;
      e.preventDefault();
      clearDmPressTimer();
      openDmMessageSheet(msg.getAttribute("data-dm-message-id"));
    });
  }

  const dmMsgSheet = document.getElementById("dm-msg-sheet");
  if (dmMsgSheet) {
    dmMsgSheet.addEventListener("click", async (e) => {
      if (e.target.closest("[data-dm-sheet-close]")) {
        e.preventDefault();
        closeDmMessageSheet();
        return;
      }
      const reactBtn = e.target.closest("[data-dm-react]");
      if (reactBtn) {
        e.preventDefault();
        await toggleDmReaction(
          reactBtn.getAttribute("data-dm-react"),
          reactBtn.getAttribute("data-dm-emoji")
        );
        return;
      }
      const editBtn = e.target.closest("[data-dm-edit]");
      if (editBtn) {
        e.preventDefault();
        startDmEdit(editBtn.getAttribute("data-dm-edit"));
        return;
      }
      const deleteBtn = e.target.closest("[data-dm-delete]");
      if (!deleteBtn) return;
      e.preventDefault();
      await handleDmDelete(
        deleteBtn.getAttribute("data-dm-delete"),
        deleteBtn.getAttribute("data-dm-delete-mode") || "for-me"
      );
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDmMessageSheet();
      if (dmNewOpen) setDmNewOpen(false);
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-profile-action]");
    if (!btn) return;
    e.preventDefault();
    const action = btn.getAttribute("data-profile-action");
    const username = btn.getAttribute("data-username") || "";
    if (!action || !username) return;
    try {
      if (action === "message") {
        await openDmWith(username);
        return;
      }
      if (action === "add-friend") {
        await communityAction({ action: "friend-request", username });
        showToast("Request sent");
      } else if (action === "accept-friend") {
        await communityAction({ action: "friend-accept", username });
        showToast("You're friends now");
      } else if (action === "decline-friend" || action === "cancel-friend" || action === "unfriend") {
        if (action === "decline-friend") {
          await communityAction({ action: "friend-decline", username });
        } else {
          await communityAction({ action: "friend-remove", username });
        }
        showToast(action === "unfriend" ? "Removed" : "Request cleared");
      }
      await loadCommunity();
    } catch (err) {
      showToast(err.message || "Something went wrong. Try again.");
    }
  });


  
  const userMenuBtn = document.getElementById("user-menu-btn");
  const userMenuDropdown = document.getElementById("user-menu-dropdown");
  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = userMenuDropdown.hidden;
      userMenuDropdown.hidden = !open;
      userMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("user-menu");
    if (menu && !menu.contains(e.target)) closeUserMenu();
  });

  document.querySelectorAll(".reddit-sort-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sort = btn.getAttribute("data-sort") || "new";
      currentSort = sort;
      try { localStorage.setItem(SORT_KEY, sort); } catch (_) {}
      if (route.type === "popular" && sort === "new") {
        navigate({ type: "home", slug: "", username: "" }).catch(() => {});
        return;
      }
      syncSortTabs();
      if (route.type === "home" || route.type === "popular" || route.type === "group" || route.type === "user") {
        loadCommunity().catch(() => {});
        return;
      }
      renderFeed(lastPosts);
    });
  });

  const recentList = document.getElementById("recent-list");
  if (recentList) {
    recentList.addEventListener("click", (e) => {
      const link = e.target.closest("[data-group]");
      if (!link) return;
      e.preventDefault();
      navigate({ type: "group", slug: link.getAttribute("data-group") || "", username: "" }).catch(() => {});
    });
  }

  const navToggle = document.getElementById("nav-toggle");
  const backdrop = document.getElementById("nav-backdrop");
  const leftNav = document.getElementById("left-nav");

  function setupActAsBanner() {
    const ACT_AS_KEY = "synk_admin_act_as";
    let act = null;
    try { act = JSON.parse(sessionStorage.getItem(ACT_AS_KEY) || "null"); } catch (_) {}
    if (!act) return;
    let bar = document.getElementById("act-as-banner");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "act-as-banner";
      bar.className = "act-as-banner";
      document.body.prepend(bar);
    }
    const name = act.memberName || (session && session.profile && session.profile.name) || "member";
    const code = act.memberCode || (session && session.profile && session.profile.synkCode) || "";
    bar.hidden = false;
    bar.innerHTML = `<span>Acting as <strong>${escapeHtml(name)}</strong>${code ? ` <span class="muted">(${escapeHtml(code)})</span>` : ""} <span class="muted">· Synk Admin</span></span>
      <button type="button" id="act-as-exit">Exit</button>`;
    const exit = document.getElementById("act-as-exit");
    if (exit) {
      exit.addEventListener("click", () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(ACT_AS_KEY);
        } catch (_) {}
        location.href = "/verify";
      });
    }
  }

  function setNavOpen(open) {
    const next = !!open;
    if (next) {
      document.body.dataset.navScrollY = String(window.scrollY || 0);
    }
    document.body.classList.toggle("reddit-nav-open", next);
    document.documentElement.classList.toggle("reddit-nav-lock", next);
    // Lock page scroll without position:fixed on body — that broke drawer stacking
    // so the gray backdrop sat above the sidebar and ate all clicks.
    document.documentElement.style.overflow = next ? "hidden" : "";
    document.body.style.overflow = next ? "hidden" : "";
    document.body.style.touchAction = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    if (backdrop) backdrop.hidden = !next;
    if (leftNav) {
      leftNav.hidden = !next;
      leftNav.setAttribute("aria-hidden", next ? "false" : "true");
    }
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", next ? "true" : "false");
      navToggle.setAttribute("aria-label", next ? "Close menu" : "Open menu");
    }
    if (!next) {
      const y = Number(document.body.dataset.navScrollY || 0);
      delete document.body.dataset.navScrollY;
      if (y) window.scrollTo(0, y);
    }
  }

  // —— Notifications popover (bell) ——
  let notifCache = [];
  let notifLoaded = false;

  function renderNotifPanel(notes) {
    const list = document.getElementById("notif-list");
    if (!list) return;
    notifCache = Array.isArray(notes) ? notes.slice() : [];
    if (!notifCache.length) {
      list.innerHTML = `<p class="muted reddit-notif-empty" id="notif-empty">You're all caught up</p>`;
      return;
    }
    list.innerHTML = notifCache
      .map((note) => {
        const meta = describeNotification(note);
        const nid = escapeHtml(String(note.id || ""));
        const unread = !note.readAt;
        const when = escapeHtml(formatRelative(note.createdAt));
        const postId = note.postId ? escapeHtml(String(note.postId)) : "";
        const actions = renderNotifActions(note, meta);
        const openAttr =
          postId && meta.kind !== "friend_request"
            ? `data-open-post="${postId}"`
            : "";
        return `<div class="reddit-notif-row ${unread ? "is-unread" : ""}" data-notif-id="${nid}" ${openAttr}>
          <div class="reddit-notif-copy">
            <strong class="reddit-notif-title">${escapeHtml(meta.title)}</strong>
            <p class="reddit-notif-desc">${escapeHtml(meta.description)}</p>
            <span class="muted">${when}</span>
            ${actions ? `<div class="reddit-notif-actions">${actions}</div>` : ""}
          </div>
        </div>`;
      })
      .join("");
  }

  function setNotifOpen(open) {
    const panel = document.getElementById("notif-panel");
    const btn = document.getElementById("notif-btn");
    if (!panel || !btn) return;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  async function refreshNotifications({ open = false } = {}) {
    try {
      const res = await fetch("/api/synk-community?inbox=1", { headers: hubHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load notifications");
      if (typeof data.unreadCount === "number") {
        unreadCount = data.unreadCount;
        updateInboxBadge();
      }
      notifLoaded = true;
      renderNotifPanel(data.notifications || []);
      if (Array.isArray(data.notifications)) lastNotifications = data.notifications.slice();
      if (open) setNotifOpen(true);
    } catch (err) {
      const list = document.getElementById("notif-list");
      if (list) list.innerHTML = `<p class="muted reddit-notif-empty">Couldn't load notifications</p>`;
      if (open) setNotifOpen(true);
    }
  }

  const notifBtn = document.getElementById("notif-btn");
  if (notifBtn) {
    notifBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = document.getElementById("notif-panel");
      const willOpen = !!(panel && panel.hidden);
      if (!willOpen) {
        setNotifOpen(false);
        return;
      }
      // Open instantly; fill as soon as data arrives.
      if (notifLoaded) {
        renderNotifPanel(notifCache.length ? notifCache : lastNotifications);
        setNotifOpen(true);
      } else {
        const list = document.getElementById("notif-list");
        if (list) list.innerHTML = `<p class="muted reddit-notif-empty">Loading…</p>`;
        setNotifOpen(true);
      }
      refreshNotifications().catch(() => {});
    });
  }
  const notifMark = document.getElementById("notif-mark-read");
  if (notifMark) {
    notifMark.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const data = await communityAction({ action: "mark-read" });
        if (Array.isArray(data.notifications)) {
          renderNotifPanel(data.notifications);
          lastNotifications = data.notifications.slice();
        }
        if (typeof data.unreadCount === "number") {
          unreadCount = data.unreadCount;
          updateInboxBadge();
        } else {
          unreadCount = 0;
          updateInboxBadge();
        }
      } catch (err) {
        showToast(err.message || "Couldn't update");
      }
    });
  }
  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("notif-wrap");
    if (wrap && !wrap.contains(e.target)) setNotifOpen(false);
  });
  
  function closeReleaseNotesModal() {
    const modal = document.getElementById("release-notes-modal");
    if (modal) modal.hidden = true;
  }

  function markdownToSafeHtml(source) {
    let text = String(source || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";

    const codes = [];
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
      codes.push(escapeHtml(code));
      return `§§CODE${codes.length - 1}§§`;
    });

    text = escapeHtml(text);
    text = text.replace(/§§CODE(\d+)§§/g, (_, i) => `<code>${codes[Number(i)] || ""}</code>`);
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

    const lines = text.split("\n");
    const out = [];
    let listType = "";
    const closeList = () => {
      if (!listType) return;
      out.push(listType === "ol" ? "</ol>" : "</ul>");
      listType = "";
    };

    for (const line of lines) {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${heading[2]}</h${level}>`);
        continue;
      }
      const ul = line.match(/^[-*•+]\s+(.+)$/);
      if (ul) {
        if (listType !== "ul") {
          closeList();
          out.push("<ul>");
          listType = "ul";
        }
        out.push(`<li>${ul[1]}</li>`);
        continue;
      }
      const ol = line.match(/^\d+[.)]\s+(.+)$/);
      if (ol) {
        if (listType !== "ol") {
          closeList();
          out.push("<ol>");
          listType = "ol";
        }
        out.push(`<li>${ol[1]}</li>`);
        continue;
      }
      if (!String(line).trim()) {
        closeList();
        continue;
      }
      closeList();
      out.push(`<p>${line}</p>`);
    }
    closeList();
    return out.join("");
  }

  function renderReleaseNotesBlocks(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) {
      return `<p class="muted">No release notes for this update yet.</p>`;
    }
    const parts = [];
    let mdChunk = [];
    let staffChunk = false;
    const flushMd = () => {
      if (!mdChunk.length) return;
      const cls = staffChunk
        ? "release-notes-md release-notes-staff"
        : "release-notes-md";
      parts.push(`<div class="${cls}">${markdownToSafeHtml(mdChunk.join("\n"))}</div>`);
      mdChunk = [];
      staffChunk = false;
    };
    blocks.forEach((block) => {
      if (!block) return;
      if (block.type === "staff-only") {
        flushMd();
        parts.push(`<div class="release-notes-staff-lock" role="note">
            <strong>Staff only</strong>
            <span>${escapeHtml(block.message || "This part may contain sensitive information and is only available to staff.")}</span>
          </div>`);
        return;
      }
      const nextStaff = !!block.staffOnly;
      if (mdChunk.length && nextStaff !== staffChunk) flushMd();
      staffChunk = nextStaff;
      mdChunk.push(String(block.text || ""));
    });
    flushMd();
    return parts.join("") || `<p class="muted">No release notes for this update yet.</p>`;
  }

  async function openReleaseNotesModal(version) {
    const modal = document.getElementById("release-notes-modal");
    const body = document.getElementById("release-notes-body");
    const sub = document.getElementById("release-notes-sub");
    if (!modal || !body) return;
    modal.hidden = false;
    body.innerHTML = `<p class="muted">Loading…</p>`;
    if (sub) sub.textContent = version ? `Update ${String(version).slice(0, 10)}` : "What’s new in this update";
    try {
      const ver = String(version || "").trim();
      const queryVer = ver || "latest";
      const res = await fetch(
        `/api/synk-community?releaseNotes=${encodeURIComponent(queryVer)}`,
        { headers: hubHeaders() }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load release notes");
      if (sub) {
        const short = String(data.version || ver).slice(0, 10);
        sub.textContent = data.isStaff
          ? `Update ${short} · full staff notes`
          : `Update ${short}`;
      }
      body.innerHTML = renderReleaseNotesBlocks(data.blocks || []);
    } catch (err) {
      body.innerHTML = `<p class="muted">${escapeHtml(err.message || "Couldn't load release notes")}</p>`;
    }
  }

document.addEventListener("click", async (e) => {
    const releaseBtn = e.target.closest("[data-notif-release-notes]");
    if (releaseBtn) {
      e.preventDefault();
      e.stopPropagation();
      const version = releaseBtn.getAttribute("data-version") || "";
      openReleaseNotesModal(version).catch(() => {});
      return;
    }
    if (e.target.closest("[data-release-notes-close]")) {
      e.preventDefault();
      closeReleaseNotesModal();
      return;
    }
    const refreshBtn = e.target.closest("[data-notif-refresh]");
    if (refreshBtn) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (window.synkForceRefresh) window.synkForceRefresh();
        else location.reload();
      } catch (_) {
        location.reload();
      }
      return;
    }
    const msgBtn = e.target.closest("[data-notif-message]");
    if (msgBtn) {
      e.preventDefault();
      e.stopPropagation();
      const username = msgBtn.getAttribute("data-notif-message") || "";
      if (username) openDmWith(username).catch(() => {});
      return;
    }
    const friendBtn = e.target.closest("[data-notif-friend]");
    if (!friendBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const username = friendBtn.getAttribute("data-username") || "";
    const act = friendBtn.getAttribute("data-notif-friend");
    if (!username || !act) return;
    const row = friendBtn.closest("[data-notif-id], [data-inbox-id]");
    const noteId = row
      ? row.getAttribute("data-notif-id") || row.getAttribute("data-inbox-id") || ""
      : "";
    friendBtn.disabled = true;
    const sibling = row ? row.querySelectorAll("[data-notif-friend]") : [];
    sibling.forEach((btn) => { btn.disabled = true; });
    try {
      if (act === "accept") {
        await communityAction({ action: "friend-accept", username });
        showToast("Friend request accepted");
      } else {
        await communityAction({ action: "friend-decline", username });
        showToast("Friend request declined");
      }
      if (noteId && !String(noteId).startsWith("friend-req-")) {
        try {
          await communityAction({ action: "mark-read", ids: [noteId] });
        } catch (_) {}
      }
      await refreshNotifications();
      if (route.type === "inbox") {
        try {
          const res = await fetch("/api/synk-community?inbox=1", { headers: hubHeaders() });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            renderInbox(data.notifications || []);
            if (typeof data.unreadCount === "number") {
              unreadCount = data.unreadCount;
              updateInboxBadge();
            }
          }
        } catch (_) {}
      }
      if (route.type === "user") await loadCommunity();
    } catch (err) {
      showToast(err.message || "Something went wrong. Try again.");
      sibling.forEach((btn) => { btn.disabled = false; });
    }
  });
  // Prefetch notifications after first paint so the bell feels instant.
  setTimeout(() => {
    if (me && publicUsername) refreshNotifications().catch(() => {});
  }, 1200);


  // Start closed — sidebar opens from the profile avatar.
  setNavOpen(false);

  try {
    const railMq = window.matchMedia("(max-width: 1100px)");
    const syncRailMq = () => {
      const rail = document.getElementById("right-rail");
      if (!rail) return;
      const forceHide =
        railMq.matches ||
        route.type === "settings" ||
        route.type === "submit" ||
        route.type === "mod" ||
        route.type === "post" ||
        route.type === "inbox" ||
        route.type === "groups" ||
        route.type === "user";
      rail.hidden = forceHide;
      rail.classList.toggle("is-hidden", forceHide);
    };
    if (railMq.addEventListener) railMq.addEventListener("change", syncRailMq);
    else if (railMq.addListener) railMq.addListener(syncRailMq);
    syncRailMq();
  } catch (_) {}
  if (navToggle) navToggle.addEventListener("click", () => setNavOpen(!document.body.classList.contains("reddit-nav-open")));
  if (backdrop) backdrop.addEventListener("click", () => setNavOpen(false));
  if (leftNav) {
    leftNav.addEventListener(
      "touchmove",
      (e) => {
        // Keep overscroll inside the drawer so the top bar does not drag.
        e.stopPropagation();
      },
      { passive: true }
    );
    leftNav.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (link) setNavOpen(false);
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setNavOpen(false);
  });

  document.getElementById("signout-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.removeItem(PERSONA_KEY);
      sessionStorage.removeItem(PERSONA_KEY);
    } catch (_) {}
    location.href = "/verify";
  });


  function refreshPostChrome(postId) {
    const post = findPost(postId);
    if (!post) return;
    if (route.type === "post" && String(route.postId) === String(postId)) renderPostDetail(post);
    else renderFeed(lastPosts);
  }

  document.addEventListener("click", async (e) => {
    const voteBtn = e.target.closest("[data-vote]");
    if (voteBtn) {
      e.preventDefault();
      const targetType = voteBtn.getAttribute("data-target-type") || "post";
      const postId = voteBtn.getAttribute("data-post-id");
      const commentId = voteBtn.getAttribute("data-comment-id");
      const targetId = targetType === "comment" ? commentId : postId;
      if (!targetId) return;
      const dir = voteBtn.getAttribute("data-vote") === "down" ? -1 : 1;
      let cur = 0;
      if (targetType === "comment") {
        const comment = (lastComments || []).find((c) => String(c.id) === String(targetId));
        cur = Number(comment && comment.myVote) || 0;
      } else {
        const post = findPost(targetId);
        cur = Number(post && post.myVote) || 0;
      }
      const next = cur === dir ? 0 : dir;
      if (targetType === "post") {
        const post = findPost(targetId);
        if (post) {
          const delta = next - cur;
          patchPost(targetId, {
            myVote: next,
            score: (Number(post.score) || 0) + delta,
          });
          refreshPostChrome(targetId);
        }
      } else {
        lastComments = (lastComments || []).map((c) => {
          if (String(c.id) !== String(targetId)) return c;
          const delta = next - cur;
          return { ...c, myVote: next, score: (Number(c.score) || 0) + delta };
        });
        renderComments(lastComments);
      }
      try {
        const data = await communityAction({
          action: "vote",
          targetType,
          targetId,
          value: next,
        });
        if (targetType === "post") {
          patchPost(targetId, {
            myVote: data.myVote,
            score: data.score,
          });
          refreshPostChrome(targetId);
        } else {
          lastComments = (lastComments || []).map((c) =>
            String(c.id) === String(targetId)
              ? { ...c, myVote: data.myVote, score: data.score }
              : c
          );
          renderComments(lastComments);
        }
      } catch (_) {
        await loadCommunity().catch(() => {});
      }
      return;
    }

    const pollBtn = e.target.closest("[data-poll-vote]");
    if (pollBtn) {
      e.preventDefault();
      const postId = pollBtn.getAttribute("data-poll-vote");
      const optionIndex = Number(pollBtn.getAttribute("data-option-index"));
      if (!postId || !Number.isInteger(optionIndex)) return;
      try {
        const data = await communityAction({
          action: "poll-vote",
          postId,
          optionIndex,
        });
        if (data.post) {
          patchPost(postId, data.post);
          if (route.type === "post" && String(route.postId) === String(postId)) {
            lastPosts = [data.post];
            renderPostDetail(data.post);
          } else {
            refreshPostChrome(postId);
          }
        }
      } catch (_) {}
      return;
    }

    const openPost = e.target.closest("[data-open-post]");
    if (openPost) {
      e.preventDefault();
      const id = openPost.getAttribute("data-open-post");
      const inboxId = openPost.getAttribute("data-inbox-id");
      if (inboxId) {
        communityAction({ action: "mark-read", ids: [inboxId] })
          .then((data) => {
            if (typeof data.unreadCount === "number") unreadCount = data.unreadCount;
            updateInboxBadge();
          })
          .catch(() => {});
      }
      navigate({ type: "post", slug: "", username: "", postId: id }).catch(() => {});
      return;
    }
    const shareBtn = e.target.closest("[data-share-post]");
    if (shareBtn) {
      e.preventDefault();
      const id = shareBtn.getAttribute("data-share-post");
      const url = `${location.origin}/community/post/${id}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      shareBtn.textContent = "✓ Copied";
      setTimeout(() => { shareBtn.innerHTML = `${ico("share", 16)} <span>Share</span>`; }, 1200);
      return;
    }
    const saveBtn = e.target.closest("[data-save-post]");
    if (saveBtn) {
      e.preventDefault();
      const id = saveBtn.getAttribute("data-save-post");
      const post = findPost(id);
      const saved = !(post && post.saved);
      patchPost(id, { saved });
      refreshPostChrome(id);
      try {
        const data = await communityAction({ action: "save", postId: id, saved });
        patchPost(id, { saved: !!data.saved });
        refreshPostChrome(id);
      } catch (_) {
        patchPost(id, { saved: !saved });
        refreshPostChrome(id);
      }
      return;
    }
    const hideBtn = e.target.closest("[data-hide-post]");
    if (hideBtn) {
      e.preventDefault();
      const id = hideBtn.getAttribute("data-hide-post");
      const prev = lastPosts.slice();
      lastPosts = (lastPosts || []).filter((p) => String(p.id) !== String(id));
      renderFeed(lastPosts);
      try {
        await communityAction({ action: "hide", postId: id, hidden: true });
      } catch (_) {
        lastPosts = prev;
        renderFeed(lastPosts);
      }
      return;
    }
  });


  document.addEventListener("click", async (e) => {
    const suggestionBtn = e.target.closest("[data-suggestion-status]");
    if (suggestionBtn) {
      e.preventDefault();
      const postId = suggestionBtn.getAttribute("data-post-id");
      const status = suggestionBtn.getAttribute("data-suggestion-status");
      if (!postId || !status) return;
      try {
        await communityAction({ action: "set-suggestion-status", postId, status });
        lastPosts = (lastPosts || []).map((p) =>
          String(p.id) === String(postId) ? { ...p, suggestionStatus: status } : p
        );
        renderFeed(lastPosts);
        showToast(status === "accepted" ? "Suggestion accepted" : status === "denied" ? "Suggestion denied" : "Suggestion reopened");
      } catch (err) {
        showToast(err.message || "Could not update suggestion");
      }
      return;
    }
  });

  document.addEventListener("click", (e) => {
    const chBtn = e.target.closest("[data-discord-channel]");
    if (!chBtn) return;
    e.preventDefault();
    const slug = chBtn.getAttribute("data-discord-channel");
    if (!slug || !route.slug) return;
    activeChannelSlug = slug;
    navigate({ type: "group", slug: route.slug, username: "", channel: slug }).catch(() => {});
  });

  const groupRoleForm = document.getElementById("group-role-form");
  if (groupRoleForm) {
    groupRoleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("group-role-status");
      const nameEl = document.getElementById("group-role-name");
      const colorEl = document.getElementById("group-role-color");
      if (!route.slug) return;
      if (status) status.textContent = "Saving…";
      try {
        const data = await communityAction({
          action: "create-group-role",
          group: route.slug,
          name: nameEl ? nameEl.value : "",
          color: colorEl ? colorEl.value : "#94a3b8",
        });
        if (activeGroupDetail) activeGroupDetail.roles = data.roles || activeGroupDetail.roles || [];
        renderGroupRoles(activeGroupDetail);
        if (nameEl) nameEl.value = "";
        if (status) status.textContent = "Role added";
      } catch (err) {
        if (status) status.textContent = err.message || "Could not add role";
      }
    });
  }

  function syncJoinButtons() {
    const joined = route.type === "group" && route.slug && activeGroupJoined;
    const group =
      activeGroupDetail ||
      (groups || []).find((g) => g.slug === route.slug) ||
      null;
    syncJoinCopy(joined, group);
  }
  ["join-community-btn", "about-join-btn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (route.type !== "group" || !route.slug) return;
      const group =
        activeGroupDetail ||
        (groups || []).find((g) => g.slug === route.slug) ||
        null;
      const next = !activeGroupJoined;
      if (!next) {
        const label = group && (group.isOfficial || group.slug === "synk") ? "Synk" : (group && group.name) || route.slug;
        if (!window.confirm(`Leave ${label}? You can rejoin anytime.`)) return;
      }
      activeGroupJoined = next;
      syncJoinButtons();
      try {
        const data = await communityAction({
          action: "join",
          group: route.slug,
          joined: next,
        });
        activeGroupJoined = !!(data.joined != null ? data.joined : next);
        if (activeGroupDetail) activeGroupDetail.joined = activeGroupJoined;
        if (typeof data.memberCount === "number" && activeGroupDetail) {
          activeGroupDetail.memberCount = data.memberCount;
        }
        groups = (groups || []).map((g) =>
          g.slug === route.slug ? { ...g, joined: activeGroupJoined } : g
        );
        syncJoinButtons();
        showToast(activeGroupJoined ? "Joined" : "Left community");
        if (route.type === "group") {
          const memberCount = activeGroupDetail && activeGroupDetail.memberCount;
          if (memberCount != null) {
            const slug = route.slug || "";
            setText(
              "view-sub",
              [slug, `${Number(memberCount).toLocaleString()} member${Number(memberCount) === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" · ")
            );
          }
        }
      } catch (err) {
        activeGroupJoined = !next;
        syncJoinButtons();
        showToast((err && err.message) || "Could not update membership");
      }
    });
  });

  const postBackBtn = document.getElementById("post-back-btn");
  if (postBackBtn) {
    postBackBtn.addEventListener("click", () => {
      if (history.length > 1) history.back();
      else navigate({ type: "home", slug: "", username: "" }).catch(() => {});
    });
  }

  function setSubmitTab(name) {
    activeSubmitType = name || "text";
    document.querySelectorAll("[data-submit-tab]").forEach((t) => {
      const on = (t.getAttribute("data-submit-tab") || "text") === activeSubmitType;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    const textFields = document.getElementById("submit-text-fields");
    const linkFields = document.getElementById("submit-link-fields");
    const imageFields = document.getElementById("submit-image-fields");
    const pollFields = document.getElementById("submit-poll-fields");
    const body = document.getElementById("post-body");
    const postBtn = document.getElementById("post-submit-btn");
    if (textFields) textFields.hidden = false;
    if (linkFields) linkFields.hidden = activeSubmitType !== "link";
    if (imageFields) imageFields.hidden = activeSubmitType !== "image";
    if (pollFields) pollFields.hidden = activeSubmitType !== "poll";
    if (body) {
      body.required = activeSubmitType === "text";
      const label = textFields && textFields.querySelector("label");
      if (label) {
        label.textContent = activeSubmitType === "text" ? "Text" : "Text (optional)";
      }
    }
    if (postBtn) postBtn.disabled = false;
  }

  document.querySelectorAll("[data-submit-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      setSubmitTab(tab.getAttribute("data-submit-tab") || "text");
    });
  });
  setSubmitTab("text");

  try { currentSort = localStorage.getItem(SORT_KEY) || "new"; } catch (_) { currentSort = "new"; }
  if (currentSort === "best") currentSort = "hot";
  renderRecent();

  const session = readSession();
  hubToken = (session && session.hubSession && session.hubSession.token) || "";
  route = parseRoute();
  const bootUrl = routeUrl(route) + (route.type === "submit" && location.search ? location.search : "");
  history.replaceState(route, "", bootUrl);
  if (!session || !hubToken) {
    lockedCard.hidden = false;
  } else {
    communityApp.hidden = false;
    loadCommunity().catch((err) => {
      const msg = String((err && err.message) || "");
      const authDead = /sign in|session expired|unauthorized|log in again/i.test(msg);
      if (authDead) {
        communityApp.hidden = true;
        lockedCard.hidden = false;
        document.getElementById("locked-help").textContent =
          msg || "Session expired. Log in again.";
        return;
      }
      // Transient deploy/network blip — keep the stay-signed-in session and retry once.
      communityApp.hidden = false;
      lockedCard.hidden = true;
      setTimeout(() => {
        loadCommunity().catch((err2) => {
          communityApp.hidden = true;
          lockedCard.hidden = false;
          document.getElementById("locked-help").textContent =
            (err2 && err2.message) || msg || "Couldn't load Community. Try again.. Try again.";
        });
      }, 1200);
    });
  }


  // —— Learn more pages + beta agenda admin + nav touch lock ——
  function fillLearnMorePageSelects() {
    window.__synkInfoPages = infoPagesCache || [];
    const options = ['<option value="">Select a page…</option>']
      .concat((infoPagesCache || []).map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`));
    const createSelect = document.getElementById("tag-learn-more-page");
    if (createSelect) {
      const prev = createSelect.value;
      createSelect.innerHTML = options.join("");
      if (prev) createSelect.value = prev;
    }
  }

  function renderInfoPagesAdmin() {
    const list = document.getElementById("info-pages-list");
    if (!list) return;
    if (!infoPagesCache.length) {
      list.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No Learn more pages yet.</p>';
      return;
    }
    list.innerHTML = infoPagesCache.map((p) => `
      <div class="community-staff-row">
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="muted" style="font-size:0.78rem;">/info/${escapeHtml(p.slug)}</div>
          <div class="muted" style="font-size:0.78rem;">${escapeHtml(p.summary || "")}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary btn-compact" type="button" data-edit-info-page="${escapeHtml(p.id)}">Edit</button>
          <button class="btn btn-secondary btn-compact" type="button" data-delete-info-page="${escapeHtml(p.id)}">Delete</button>
        </div>
      </div>
    `).join("");
  }

  function resetInfoPageForm() {
    const id = document.getElementById("info-page-id");
    if (id) id.value = "";
    ["info-page-title","info-page-slug","info-page-summary","info-page-hero","info-page-blocks"].forEach((fid) => {
      const el = document.getElementById(fid);
      if (el) el.value = "";
    });
    const status = document.getElementById("info-page-status");
    if (status) status.textContent = "";
    const btn = document.getElementById("info-page-save-btn");
    if (btn) btn.textContent = "Save page";
  }

  async function loadInfoPagesForMods() {
    if (!(me && me.isStaff)) return;
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action: "list-info-pages" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load pages");
      infoPagesCache = data.pages || [];
      fillLearnMorePageSelects();
      renderInfoPagesAdmin();
      renderTagCatalog();
    } catch (err) {
      console.warn(err);
    }
  }

  async function loadBetaAgendaAdmin() {
    if (!(me && me.isStaff)) return;
    const list = document.getElementById("beta-agenda-admin-list");
    if (!list) return;
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action: "beta-admin-agenda" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load agenda");
      const items = data.agenda || [];
      list._agendaItems = items;
      if (!items.length) {
        list.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No agenda items yet.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="community-staff-row">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="muted" style="font-size:0.78rem;">${escapeHtml(item.detail || "")}</div>
            <div class="muted" style="font-size:0.75rem;">sort ${escapeHtml(String(item.sortOrder ?? 0))} · ${item.active === false ? "inactive" : "active"}</div>
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary btn-compact" type="button" data-edit-agenda="${escapeHtml(item.id)}">Edit</button>
            <button class="btn btn-secondary btn-compact" type="button" data-delete-agenda="${escapeHtml(item.id)}">Delete</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      list.innerHTML = `<p class="muted">${escapeHtml(err.message || "Could not load agenda")}</p>`;
    }
  }

  const learnEnable = document.getElementById("tag-learn-more-enabled");
  const learnWrap = document.getElementById("tag-learn-more-page-wrap");
  if (learnEnable && learnWrap) {
    learnEnable.addEventListener("change", () => {
      learnWrap.hidden = !learnEnable.checked;
    });
  }

  const infoPageForm = document.getElementById("info-page-form");
  if (infoPageForm) {
    infoPageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("info-page-status");
      if (status) status.textContent = "Saving…";
      let blocks = [];
      try {
        const raw = (document.getElementById("info-page-blocks").value || "").trim();
        blocks = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(blocks)) throw new Error("Blocks must be a JSON array");
      } catch (err) {
        if (status) status.textContent = err.message || "Invalid blocks JSON";
        return;
      }
      const pageId = document.getElementById("info-page-id").value;
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({
            action: pageId ? "update-info-page" : "create-info-page",
            pageId: pageId || undefined,
            title: document.getElementById("info-page-title").value,
            slug: document.getElementById("info-page-slug").value,
            summary: document.getElementById("info-page-summary").value,
            heroImageUrl: document.getElementById("info-page-hero").value,
            blocks,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save page");
        infoPagesCache = data.pages || [];
        fillLearnMorePageSelects();
        renderInfoPagesAdmin();
        resetInfoPageForm();
        renderTagCatalog();
        if (status) status.textContent = "Saved";
      } catch (err) {
        if (status) status.textContent = err.message || "Could not save page";
      }
    });
  }
  const infoReset = document.getElementById("info-page-reset-btn");
  if (infoReset) infoReset.addEventListener("click", () => resetInfoPageForm());

  const infoList = document.getElementById("info-pages-list");
  if (infoList) {
    infoList.addEventListener("click", async (e) => {
      const edit = e.target.closest("[data-edit-info-page]");
      const del = e.target.closest("[data-delete-info-page]");
      if (edit) {
        const id = edit.getAttribute("data-edit-info-page");
        const page = (infoPagesCache || []).find((p) => String(p.id) === String(id));
        if (!page) return;
        document.getElementById("info-page-id").value = page.id;
        document.getElementById("info-page-title").value = page.title || "";
        document.getElementById("info-page-slug").value = page.slug || "";
        document.getElementById("info-page-summary").value = page.summary || "";
        document.getElementById("info-page-hero").value = page.heroImageUrl || "";
        document.getElementById("info-page-blocks").value = JSON.stringify(page.blocks || [], null, 2);
        const btn = document.getElementById("info-page-save-btn");
        if (btn) btn.textContent = "Update page";
        return;
      }
      if (del) {
        const id = del.getAttribute("data-delete-info-page");
        if (!confirm("Delete this Learn more page?")) return;
        const status = document.getElementById("info-page-status");
        if (status) status.textContent = "Deleting…";
        try {
          const res = await fetch("/api/synk-community", {
            method: "POST",
            headers: hubHeaders(),
            body: JSON.stringify({ action: "delete-info-page", pageId: id }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Could not delete page");
          infoPagesCache = data.pages || [];
          fillLearnMorePageSelects();
          renderInfoPagesAdmin();
          renderTagCatalog();
          if (status) status.textContent = "Deleted";
        } catch (err) {
          if (status) status.textContent = err.message || "Could not delete page";
        }
      }
    });
  }

  const agendaForm = document.getElementById("beta-agenda-form");
  if (agendaForm) {
    agendaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("beta-agenda-status");
      if (status) status.textContent = "Saving…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({
            action: "beta-save-agenda-item",
            itemId: document.getElementById("beta-agenda-id").value || undefined,
            title: document.getElementById("beta-agenda-title").value,
            detail: document.getElementById("beta-agenda-detail").value,
            sortOrder: Number(document.getElementById("beta-agenda-sort").value || 0),
            active: document.getElementById("beta-agenda-active").checked,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save agenda item");
        document.getElementById("beta-agenda-id").value = "";
        document.getElementById("beta-agenda-title").value = "";
        document.getElementById("beta-agenda-detail").value = "";
        document.getElementById("beta-agenda-sort").value = "0";
        document.getElementById("beta-agenda-active").checked = true;
        if (status) status.textContent = "Saved";
        await loadBetaAgendaAdmin();
      } catch (err) {
        if (status) status.textContent = err.message || "Could not save";
      }
    });
  }
  const agendaReset = document.getElementById("beta-agenda-reset-btn");
  if (agendaReset) {
    agendaReset.addEventListener("click", () => {
      document.getElementById("beta-agenda-id").value = "";
      document.getElementById("beta-agenda-title").value = "";
      document.getElementById("beta-agenda-detail").value = "";
      document.getElementById("beta-agenda-sort").value = "0";
      document.getElementById("beta-agenda-active").checked = true;
      const status = document.getElementById("beta-agenda-status");
      if (status) status.textContent = "";
    });
  }
  const agendaList = document.getElementById("beta-agenda-admin-list");
  if (agendaList) {
    agendaList.addEventListener("click", async (e) => {
      const edit = e.target.closest("[data-edit-agenda]");
      const del = e.target.closest("[data-delete-agenda]");
      if (edit) {
        const id = edit.getAttribute("data-edit-agenda");
        const items = agendaList._agendaItems || [];
        const item = items.find((x) => String(x.id) === String(id));
        if (!item) return;
        document.getElementById("beta-agenda-id").value = item.id;
        document.getElementById("beta-agenda-title").value = item.title || "";
        document.getElementById("beta-agenda-detail").value = item.detail || "";
        document.getElementById("beta-agenda-sort").value = String(item.sortOrder ?? 0);
        document.getElementById("beta-agenda-active").checked = item.active !== false;
        return;
      }
      if (del) {
        const id = del.getAttribute("data-delete-agenda");
        if (!confirm("Delete this agenda item?")) return;
        try {
          const res = await fetch("/api/synk-community", {
            method: "POST",
            headers: hubHeaders(),
            body: JSON.stringify({ action: "beta-delete-agenda-item", itemId: id }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Could not delete");
          await loadBetaAgendaAdmin();
        } catch (err) {
          alert(err.message || "Could not delete");
        }
      }
    });
  }

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!document.body.classList.contains("reddit-nav-open")) return;
      const inDrawer = e.target.closest && e.target.closest("#left-nav");
      if (!inDrawer) e.preventDefault();
    },
    { passive: false }
  );

  const MOD_PANEL_STORAGE_KEY = "synk_mod_panels_v1";

  function visibleModPanels() {
    return Array.from(document.querySelectorAll("#mod-view details.mod-panel")).filter((panel) => {
      if (panel.closest("[hidden]")) return false;
      const style = window.getComputedStyle(panel);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function readModPanelState() {
    try {
      const raw = localStorage.getItem(MOD_PANEL_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function writeModPanelState() {
    const state = {};
    document.querySelectorAll("#mod-view details.mod-panel[data-mod-panel]").forEach((panel) => {
      const key = panel.getAttribute("data-mod-panel");
      if (key) state[key] = !!panel.open;
    });
    try {
      localStorage.setItem(MOD_PANEL_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function restoreModPanelState() {
    const saved = readModPanelState();
    if (!saved) return;
    document.querySelectorAll("#mod-view details.mod-panel[data-mod-panel]").forEach((panel) => {
      const key = panel.getAttribute("data-mod-panel");
      if (!key || !Object.prototype.hasOwnProperty.call(saved, key)) return;
      panel.open = !!saved[key];
    });
  }

  function syncModJumpActive() {
    const jumps = document.getElementById("mod-tools-jumps");
    if (!jumps) return;
    jumps.querySelectorAll("[data-mod-jump]").forEach((btn) => {
      const key = btn.getAttribute("data-mod-jump");
      const panel = document.querySelector(`#mod-view details.mod-panel[data-mod-panel="${key}"]`);
      btn.classList.toggle("is-open", !!(panel && panel.open));
    });
  }

  function refreshModToolsChrome() {
    const toolbar = document.getElementById("mod-tools-toolbar");
    const jumps = document.getElementById("mod-tools-jumps");
    if (!toolbar || !jumps) return;
    const onMod = route.type === "mod";
    const panels = onMod ? visibleModPanels() : [];
    toolbar.hidden = !onMod || panels.length === 0;
    if (!onMod) return;
    jumps.innerHTML = panels
      .map((panel) => {
        const key = panel.getAttribute("data-mod-panel") || panel.id || "";
        const titleEl = panel.querySelector(".mod-panel-title");
        const label = (titleEl && titleEl.textContent) || key || "Section";
        return `<button type="button" class="mod-tools-jump" data-mod-jump="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
      })
      .join("");
    syncModJumpActive();
  }

  function openModPanel(key, { scroll = true, exclusive = false } = {}) {
    const panels = visibleModPanels();
    panels.forEach((panel) => {
      const panelKey = panel.getAttribute("data-mod-panel");
      if (exclusive && panelKey !== key) panel.open = false;
      if (panelKey === key) panel.open = true;
    });
    writeModPanelState();
    syncModJumpActive();
    if (scroll) {
      const target = document.querySelector(`#mod-view details.mod-panel[data-mod-panel="${key}"]`);
      if (target) {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (_) {
          target.scrollIntoView();
        }
      }
    }
  }

  function setAllModPanels(open) {
    visibleModPanels().forEach((panel) => {
      panel.open = !!open;
    });
    writeModPanelState();
    syncModJumpActive();
  }

  function initModToolsPanels() {
    restoreModPanelState();
    const root = document.getElementById("mod-view");
    if (root && !root.dataset.modPanelsBound) {
      root.dataset.modPanelsBound = "1";
      root.addEventListener("toggle", (e) => {
        const panel = e.target;
        if (!(panel instanceof HTMLDetailsElement)) return;
        if (!panel.classList.contains("mod-panel")) return;
        writeModPanelState();
        syncModJumpActive();
      }, true);
    }
    const jumps = document.getElementById("mod-tools-jumps");
    if (jumps && !jumps.dataset.bound) {
      jumps.dataset.bound = "1";
      jumps.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-mod-jump]");
        if (!btn) return;
        e.preventDefault();
        openModPanel(btn.getAttribute("data-mod-jump"), { scroll: true, exclusive: true });
      });
    }
    const expandBtn = document.getElementById("mod-expand-all");
    if (expandBtn && !expandBtn.dataset.bound) {
      expandBtn.dataset.bound = "1";
      expandBtn.addEventListener("click", () => setAllModPanels(true));
    }
    const collapseBtn = document.getElementById("mod-collapse-all");
    if (collapseBtn && !collapseBtn.dataset.bound) {
      collapseBtn.dataset.bound = "1";
      collapseBtn.addEventListener("click", () => setAllModPanels(false));
    }
    refreshModToolsChrome();
  }

  const _applyUsernameState = typeof applyUsernameState === "function" ? applyUsernameState : null;
  if (_applyUsernameState) {
    applyUsernameState = function patchedApplyUsernameState() {
      _applyUsernameState();
      if (route.type === "mod") refreshModToolsChrome();
    };
  }

  initModToolsPanels();

  const _applyStaffState = typeof applyStaffState === "function" ? applyStaffState : null;
  if (_applyStaffState) {
    applyStaffState = function patchedApplyStaffState() {
      _applyStaffState();
      if (me && me.isStaff) {
        loadInfoPagesForMods();
        loadBetaAgendaAdmin();
      }
      refreshModToolsChrome();
    };
  }



  

})();
