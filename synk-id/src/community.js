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
    up: '<path d="M12 5 4 16h16L12 5z"/>',
    down: '<path d="M12 19 4 8h16l-8 11z"/>',
    comment: '<path d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7z"/>',
    share: '<path d="M14 7h6v6"/><path d="M20 7 10.5 16.5"/><path d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.5L6 21V5a1 1 0 0 1 1-1z"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.35"/><path d="M16.5 3.7a3.5 3.5 0 0 1 0 6.6"/>',
    userPlus: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.5"/><path d="M19 8v6M16 11h6"/>',
    userCheck: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.5"/><path d="m16 11 2 2 4-4"/>',
    userMinus: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.5"/><path d="M16 11h6"/>',
    hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>',
    megaphone: '<path d="m3 11 19-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    scroll: '<path d="M8 3H7a3 3 0 0 0 0 6h1"/><path d="M16 3h1a3 3 0 0 1 0 6h-1"/><path d="M8 3v14a3 3 0 0 0 3 3h5"/><path d="M16 3v5"/><path d="M10 9h4"/><path d="M10 13h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>',
    lifeBuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m7.5 7.5 1.8 1.8"/><path d="m14.7 14.7 1.8 1.8"/><path d="m14.7 9.3 1.8-1.8"/><path d="m7.5 16.5 1.8-1.8"/>',
    bug: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    chatHash: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  };

  function ico(name, size = 18) {
    const body = ICO_PATHS[name] || "";
    if (name === "up" || name === "down") {
      return `<svg class="r-ico r-ico-vote" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}</svg>`;
    }
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
  let presenceStatus = "online";
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
  const SUGGESTION_TAGS = [
    { id: "feature", label: "Feature", color: "#57F287" },
    { id: "ui", label: "UI", color: "#5865F2" },
    { id: "mobile", label: "Mobile", color: "#FEE75C" },
    { id: "performance", label: "Performance", color: "#EB459E" },
    { id: "bugfix", label: "Bugfix", color: "#ED4245" },
    { id: "other", label: "Other", color: "#99AAB5" },
  ];
  const SUGGESTION_STATUS_LABELS = {
    open: "Open",
    planned: "Planned",
    accepted: "Accepted",
    implemented: "Implemented",
    denied: "Denied",
    closed: "Closed",
  };
  let forumSelectedTags = [];

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
  let activePost = null;
  let unreadCount = 0;
  let activeSubmitType = "text";
  let activeGroupJoined = false;
  let activeChannelSlug = "";
  let activeGroupDetail = null;
  let pendingServerIconData = "";
  let clearServerIcon = false;
  /** @type {Map<string, { at: number, data: any }>} */
  const routePayloadCache = new Map();
  const ROUTE_CACHE_TTL_MS = 90_000;
  let communityLoadAbort = null;
  let communityLoadSeq = 0;
  /** @type {Map<string, { messages: any[], thread: any, at: number }>} */
  const dmThreadCache = new Map();

  function readSession() {
    if (window.SynkSession) return window.SynkSession.readSession();
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

  function formatDmBubbleTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const now = new Date();
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (sameDay) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate();
      if (isYesterday) {
        return `Yday ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      }
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  /** Profile "Joined …" — month + year only (no day/time). */
  function formatJoinedMonthYear(iso) {
    try {
      return new Date(iso).toLocaleDateString([], {
        month: "long",
        year: "numeric",
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

  async function cropImageFile(file, options = {}) {
    if (!file) return "";
    if (window.SynkImageCrop && typeof window.SynkImageCrop.open === "function") {
      const result = await window.SynkImageCrop.open({ file, ...options });
      return result && result.dataUrl ? result.dataUrl : "";
    }
    return readFileAsDataUrl(file);
  }

  function updateSessionPhotoUrl(nextPhotoUrl) {
    try {
      const session = readSession();
      if (!session || !session.profile) return;
      session.profile.photoUrl = nextPhotoUrl || "";
      if (window.SynkSession) {
        window.SynkSession.writeSession(session);
      } else {
        const raw = JSON.stringify(session);
        const stay = !!(session.staySignedIn || (session.hubSession && session.hubSession.staySignedIn));
        if (stay) {
          localStorage.setItem(STORAGE_KEY, raw);
          sessionStorage.removeItem(STORAGE_KEY);
        } else if (localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, raw);
        } else {
          sessionStorage.setItem(STORAGE_KEY, raw);
        }
      }
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
    // Public handle — no u/ prefix.
    return `<span class="author-with-tag">${avatar}<a class="community-user-link" href="/user/${escapeHtml(username)}">${escapeHtml(username)}</a>${tag}</span>`;
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

  function canManageTags() {
    return !!(me && (me.isStaff || me.isOwner || me.role === "owner" || me.role === "admin"));
  }

  function tagManagerHtml({ targetType, targetKey, assigned = [] }) {
    if (!canManageTags()) return "";
    const assignedIds = new Set((assigned || []).map((tag) => String(tag.id)));
    const available = (tags || []).filter((tag) => !assignedIds.has(String(tag.id)));
    const count = (assigned || []).length;
    const chips = (assigned || [])
      .map((tag) => {
        const chip = tagChip(tag, { compact: true });
        return `<span class="community-tag-manage-item">${chip}<button type="button" class="community-tag-remove" data-tag-unassign="${escapeHtml(
          String(tag.id || "")
        )}" data-tag-target="${escapeHtml(targetType)}" data-tag-key="${escapeHtml(
          targetKey
        )}" aria-label="Remove ${escapeHtml(tag.name || "tag")}">×</button></span>`;
      })
      .join("");
    const options = available.length
      ? available
          .map(
            (tag) =>
              `<option value="${escapeHtml(String(tag.id))}">${escapeHtml(tag.name || tag.slug)}</option>`
          )
          .join("")
      : `<option value="" disabled>No more tags</option>`;
    const summary = count ? `Tags · ${count}` : "Add tags";
    return `<details class="community-tag-manager" data-tag-target="${escapeHtml(
      targetType
    )}" data-tag-key="${escapeHtml(targetKey)}">
      <summary class="community-tag-manager-summary">${escapeHtml(summary)}</summary>
      <div class="community-tag-manage-list">${chips || '<span class="muted community-tag-manage-empty">No tags yet</span>'}</div>
      <div class="community-tag-manage-add">
        <label class="sr-only" for="tag-manage-select-${escapeHtml(targetType)}-${escapeHtml(targetKey)}">Add tag</label>
        <select id="tag-manage-select-${escapeHtml(targetType)}-${escapeHtml(targetKey)}" data-tag-select>${options}</select>
        <button type="button" class="btn btn-secondary btn-compact" data-tag-assign data-tag-target="${escapeHtml(
          targetType
        )}" data-tag-key="${escapeHtml(targetKey)}">Add</button>
      </div>
    </details>`;
  }

  async function assignTagFromUi({ targetType, targetKey, tagId }) {
    if (!canManageTags() || !tagId || !targetKey) return;
    const payload = { action: "assign-tag", tagId };
    if (targetType === "group") payload.group = targetKey;
    else payload.username = targetKey;
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hubHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || "Could not assign tag");
    return data;
  }

  async function unassignTagFromUi({ targetType, targetKey, tagId }) {
    if (!canManageTags() || !tagId || !targetKey) return;
    const payload = { action: "unassign-tag", tagId };
    if (targetType === "group") payload.group = targetKey;
    else payload.username = targetKey;
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hubHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || "Could not remove tag");
    return data;
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
      <p class="muted" style="margin:8px 0 0;font-size:0.82rem;">Select a badge for details. You can pin one badge next to your name.</p>
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
      try {
      if (window.SynkPush && window.SynkPush.setAppBadge) {
        window.SynkPush.setAppBadge(unreadCount > 0 ? unreadCount : 0).catch(() => {});
      }
    } catch (_) {}
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

  let contentLoadToken = 0;
  let contentLoadTimer = 0;
  const CONTENT_LOADER_DELAY_MS = 520;

  function synkLoadingHtml({ size = 64, label = "Loading", inline = true } = {}) {
    const mark =
      window.SynkLoader && typeof window.SynkLoader.markup === "function"
        ? window.SynkLoader.markup({ size, label })
        : `<p class="muted">${escapeHtml(label)}…</p>`;
    if (!inline) return mark;
    return `<div class="synk-loader-inline" aria-busy="true">${mark}</div>`;
  }

  function plainLoadingHtml(label = "Loading") {
    return `<p class="muted" aria-busy="true">${escapeHtml(label)}…</p>`;
  }

  function hideSynkBootLoader() {
    try {
      if (window.SynkLoader && typeof window.SynkLoader.hide === "function") {
        window.SynkLoader.hide();
      } else {
        const el = document.getElementById("synk-boot-loader");
        if (el) el.hidden = true;
        document.documentElement.classList.remove("synk-loading");
      }
    } catch (_) {}
  }

  function cancelContentLoader() {
    contentLoadToken += 1;
    if (contentLoadTimer) {
      window.clearTimeout(contentLoadTimer);
      contentLoadTimer = 0;
    }
  }

  function scheduleFeedLoader() {
    if (!feedEl) return;
    if (feedEmpty) feedEmpty.hidden = true;
    // Keep current feed visible; only swap to the logo if the wait is real.
    const token = ++contentLoadToken;
    if (contentLoadTimer) window.clearTimeout(contentLoadTimer);
    contentLoadTimer = window.setTimeout(() => {
      contentLoadTimer = 0;
      if (token !== contentLoadToken || !feedEl) return;
      feedEl.innerHTML = synkLoadingHtml({ size: 72, label: "Loading feed" });
    }, CONTENT_LOADER_DELAY_MS);
  }

  function schedulePostLoader() {
    const el = document.getElementById("post-detail");
    if (!el) return;
    const token = ++contentLoadToken;
    if (contentLoadTimer) window.clearTimeout(contentLoadTimer);
    contentLoadTimer = window.setTimeout(() => {
      contentLoadTimer = 0;
      if (token !== contentLoadToken) return;
      const detail = document.getElementById("post-detail");
      if (!detail) return;
      detail.innerHTML = synkLoadingHtml({ size: 64, label: "Loading post" });
      const comments = document.getElementById("comments-list");
      if (comments) comments.innerHTML = "";
      const empty = document.getElementById("comments-empty");
      if (empty) empty.hidden = true;
    }, CONTENT_LOADER_DELAY_MS);
  }

  async function communityAction(payload) {
    const body = { ...(payload || {}) };
    const action = String(body.action || "").trim().toLowerCase();
    const socialActions = new Set([
      "dm-list",
      "dm-open",
      "dm-send",
      "dm-edit",
      "dm-delete",
      "dm-react",
      "dm-friends",
      "friend-request",
      "friend-accept",
      "friend-decline",
      "friend-remove",
      "follow",
      "unfollow",
      "list-followers",
      "list-following",
    ]);
    if (socialActions.has(action) && !body.asUsername && !body.as_username) {
      const acting = typeof actingUsername === "function" ? actingUsername() : "";
      if (acting) body.asUsername = acting;
    }
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: hubHeaders(),
      body: JSON.stringify(body),
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
    syncFeedChrome();
  }

  function syncFeedChrome() {
    const sortHost = document.getElementById("sort-tabs");
    const pageHead = document.getElementById("page-head");
    const onSearch = route.type === "search";
    const tab = onSearch ? String(route.tab || "all") : "all";
    const postCount = Array.isArray(lastPosts) ? lastPosts.filter((p) => p && !p.hidden).length : 0;
    const onHomeLike = route.type === "home" || route.type === "popular";
    if (sortHost) {
      if (onSearch) sortHost.hidden = tab !== "all" && tab !== "popular";
      else if (onHomeLike && postCount === 0) sortHost.hidden = true;
      else if (route.type === "groups" || route.type === "inbox" || route.type === "settings" || route.type === "submit" || route.type === "mod") sortHost.hidden = true;
      else sortHost.hidden = false;
    }
    if (pageHead) {
      pageHead.classList.toggle("is-home-quiet", route.type === "home" && postCount === 0);
    }
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
        route.type === "user" ||
        route.type === "search" ||
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 1100px)").matches);
      rightRail.hidden = hideRail;
      rightRail.classList.toggle("is-hidden", hideRail);
    }
    const aboutMeta = document.getElementById("about-meta");
    if (aboutMeta) aboutMeta.hidden = true;
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
      if (aboutTitle) aboutTitle.textContent = group ? `About ${group.name || group.slug}` : "About community";
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
      const joinedCount = (groups || []).filter(isGroupJoined).length;
      const total = (groups || []).length;
      if (aboutBlurb) {
        aboutBlurb.textContent =
          joinedCount > 0
            ? `You’re in ${joinedCount} of ${total} communities. Join more from Discover.`
            : "Browse Discover to join communities and build your feed.";
      }
      if (statPostsLabel) statPostsLabel.textContent = "Joined";
      if (statPosts) statPosts.textContent = String(joinedCount);
      if (statGroups) statGroups.textContent = String(total);
      const aboutJoin = document.getElementById("about-join-btn");
      if (aboutJoin) aboutJoin.hidden = true;
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

  function routeCacheKey(r = route) {
    const sort = typeof apiSort === "function" ? apiSort() : currentSort || "new";
    const type = (r && r.type) || "home";
    if (type === "post") return `post:${r.postId || ""}`;
    if (type === "group") return `group:${r.slug || ""}:${r.channel || activeChannelSlug || ""}:${sort}`;
    if (type === "user") return `user:${r.username || ""}:${sort}`;
    if (type === "search") return `search:${r.query || ""}:${r.tab || "all"}:${sort}`;
    if (type === "popular") return `popular:${sort}`;
    if (type === "inbox") return `inbox`;
    if (type === "home") return `home:${sort}`;
    return `${type}`;
  }

  function readRouteCache(r = route) {
    const key = routeCacheKey(r);
    const hit = routePayloadCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > ROUTE_CACHE_TTL_MS) {
      routePayloadCache.delete(key);
      return null;
    }
    return hit.data;
  }

  function writeRouteCache(r, data) {
    if (!data) return;
    routePayloadCache.set(routeCacheKey(r), { at: Date.now(), data });
    // Soft cap so memory stays bounded during long sessions.
    if (routePayloadCache.size > 24) {
      const oldest = routePayloadCache.keys().next().value;
      if (oldest) routePayloadCache.delete(oldest);
    }
  }

  function paintRouteShell(next, cached) {
    try {
      applyUsernameState();
    } catch (_) {}
    try {
      applyStaffState();
    } catch (_) {}
    try {
      syncTabBar();
    } catch (_) {}
    try {
      applyViewState(
        cached || {
          me,
          groups,
          tags,
          staff,
          ownerUsername,
          posts: lastPosts,
          comments: lastComments,
          notifications: lastNotifications,
          post:
            next.type === "post"
              ? (lastPosts || []).find((p) => String(p.id) === String(next.postId || ""))
              : null,
        }
      );
    } catch (_) {}
    if (next.type === "groups") {
      try {
        renderGroupsPage();
      } catch (_) {}
    }
    if (next.type === "inbox") {
      try {
        setInboxTab(inboxTab);
        if (inboxTab === "messages") renderDmThreads(dmThreads || []);
        else if (lastNotifications && lastNotifications.length) renderInbox(lastNotifications);
      } catch (_) {}
    }
    if (
      cached &&
      (next.type === "home" ||
        next.type === "popular" ||
        next.type === "group" ||
        next.type === "user" ||
        next.type === "search")
    ) {
      try {
        if (next.type === "search") renderSearchResults(cached);
        else renderFeed(cached.posts || lastPosts || []);
      } catch (_) {}
    }
    if (cached && next.type === "post") {
      try {
        const post = cached.post || (cached.posts && cached.posts[0]) || null;
        if (post) {
          lastPosts = [post];
          renderPostDetail(post);
        }
        if (Array.isArray(cached.comments)) {
          lastComments = cached.comments;
          renderComments(lastComments);
        }
      } catch (_) {}
    }
  }

  async function navigate(next, { replace = false } = {}) {
    try {
      setNavOpen(false);
    } catch (_) {}
    try {
      setNotifOpen(false);
    } catch (_) {}
    route = next;
    const url = routeUrl(next);
    if (replace) history.replaceState(next, "", url);
    else history.pushState(next, "", url);

    const shellOnly =
      next.type === "settings" ||
      next.type === "submit" ||
      next.type === "mod" ||
      next.type === "groups" ||
      next.type === "inbox";
    const cached = readRouteCache(next);

    // Instant chrome + cached content — never wait on the network to flip views.
    paintRouteShell(next, cached);

    // Background refresh. Soft = keep current paint / skip skeletons, still fetch real data.
    loadCommunity({ soft: !!(cached || shellOnly) }).catch(() => {});
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

  function actingUsername() {
    return String(activePersona || publicUsername || "")
      .trim()
      .toLowerCase();
  }

  function isActingAsAlt() {
    const acting = actingUsername();
    return Boolean(acting && publicUsername && acting !== publicUsername);
  }

  function activeAccountProfile() {
    const acting = actingUsername();
    if (!acting || !publicUsername || acting === publicUsername) {
      return {
        username: publicUsername || "",
        displayName: displayName || "",
        bio: bio || "",
        dmPolicy: dmPolicy || "friends",
        presenceStatus: presenceStatus || "online",
        avatarUrl: avatarUrl || "",
        isAlt: false,
      };
    }
    const alt = (alts || []).find((a) => a.username === acting);
    return {
      username: acting,
      displayName: (alt && alt.displayName) || "",
      bio: (alt && alt.bio) || "",
      dmPolicy: (alt && alt.dmPolicy) || "friends",
      presenceStatus: (alt && alt.presenceStatus) || "online",
      avatarUrl: (alt && alt.avatarUrl) || "",
      isAlt: true,
    };
  }

  function normalizePresenceStatus(value) {
    const status = String(value || "")
      .trim()
      .toLowerCase();
    if (status === "idle" || status === "away") return "idle";
    if (status === "dnd" || status === "do_not_disturb" || status === "do-not-disturb") {
      return "dnd";
    }
    if (status === "offline" || status === "invisible") return "offline";
    return "online";
  }

  function presenceLabel(status) {
    switch (normalizePresenceStatus(status)) {
      case "idle":
        return "Idle";
      case "dnd":
        return "Do Not Disturb";
      case "offline":
        return "Offline";
      default:
        return "Online";
    }
  }

  function presenceDotMarkup(status, { hidden = false } = {}) {
    const normalized = normalizePresenceStatus(status);
    const label = presenceLabel(normalized);
    const hideAttr = hidden ? " hidden" : "";
    return `<span class="community-presence-dot is-${escapeHtml(
      normalized
    )}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"${hideAttr}></span>`;
  }

  function paintPresenceDot(el, status, { hidden = false } = {}) {
    if (!el) return;
    const normalized = normalizePresenceStatus(status);
    const label = presenceLabel(normalized);
    el.className = `community-presence-dot is-${normalized}`;
    el.title = label;
    el.setAttribute("aria-label", label);
    if (hidden) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
    el.hidden = !!hidden;
  }

  function syncMenuPresenceUi(status) {
    const normalized = normalizePresenceStatus(status || presenceStatus || "online");
    const label = presenceLabel(normalized);
    const btn = document.getElementById("menu-presence-btn");
    const labelEl = document.getElementById("menu-presence-label");
    const dot = document.getElementById("menu-presence-dot");
    const menu = document.getElementById("menu-presence-menu");
    paintPresenceDot(dot, normalized);
    if (labelEl) labelEl.textContent = label;
    if (btn) {
      btn.title = `Status: ${label}`;
      btn.setAttribute("aria-label", `Status: ${label}. Change status`);
    }
    if (menu) {
      menu.querySelectorAll("[data-presence]").forEach((item) => {
        const selected = item.getAttribute("data-presence") === normalized;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-checked", selected ? "true" : "false");
      });
    }
  }

  function closeMenuPresenceMenu() {
    const wrap = document.getElementById("menu-presence");
    const btn = document.getElementById("menu-presence-btn");
    const menu = document.getElementById("menu-presence-menu");
    if (menu) {
      menu.hidden = true;
      menu.style.position = "";
      menu.style.left = "";
      menu.style.top = "";
      menu.style.minWidth = "";
      menu.style.zIndex = "";
    }
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (wrap) wrap.classList.remove("is-open");
  }

  function openMenuPresenceMenu() {
    const wrap = document.getElementById("menu-presence");
    const btn = document.getElementById("menu-presence-btn");
    const menu = document.getElementById("menu-presence-menu");
    if (!menu || !btn) return;
    syncMenuPresenceUi(activeAccountProfile().presenceStatus || presenceStatus);
    menu.hidden = false;
    const rect = btn.getBoundingClientRect();
    const menuWidth = Math.max(188, rect.width + 140);
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    let top = rect.bottom + 8;
    menu.style.position = "fixed";
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.minWidth = `${menuWidth}px`;
    menu.style.zIndex = "400";
    // If it would hang off the bottom, flip above the button.
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuRect.height - 8);
      menu.style.top = `${Math.round(top)}px`;
    }
    btn.setAttribute("aria-expanded", "true");
    if (wrap) wrap.classList.add("is-open");
  }

  function toggleMenuPresenceMenu() {
    const menu = document.getElementById("menu-presence-menu");
    if (!menu || menu.hidden) openMenuPresenceMenu();
    else closeMenuPresenceMenu();
  }

  async function savePresenceStatus(nextStatus) {
    const normalized = normalizePresenceStatus(nextStatus);
    const data = await communityAction({
      action: "set-presence",
      presenceStatus: normalized,
      username: actingUsername() || publicUsername,
    });
    const savedFor = String(data.username || actingUsername() || publicUsername)
      .trim()
      .toLowerCase();
    const savedStatus = normalizePresenceStatus(data.presenceStatus || normalized);
    if (savedFor === publicUsername) {
      presenceStatus = savedStatus;
      if (me) me.presenceStatus = savedStatus;
    } else {
      alts = (alts || []).map((alt) =>
        alt.username === savedFor ? { ...alt, presenceStatus: savedStatus } : alt
      );
      if (me) me.alts = alts;
    }
    syncMenuPresenceUi(savedStatus);
    return savedStatus;
  }

  function storePersona(username) {
    const next = String(username || "").trim().toLowerCase();
    const changed = next !== String(activePersona || "").trim().toLowerCase();
    activePersona = next;
    try {
      localStorage.setItem(PERSONA_KEY, activePersona);
      sessionStorage.setItem(PERSONA_KEY, activePersona);
    } catch (_) {}
    syncPersonaUi();
    syncTabBar();
    applyUsernameState();
    if (changed) {
      // DMs/friends are per-username — reset chat state for the newly selected account.
      activeDmUser = "";
      activeDmThreadId = "";
      activeDmMessages = [];
      try {
        if (typeof setDmChatOpen === "function") setDmChatOpen(false);
        if (typeof renderDmMessages === "function") renderDmMessages([]);
        if (typeof renderDmThreads === "function") renderDmThreads([]);
      } catch (_) {}
    }
    // Social graphs are per-username, so refresh inbox / profile when the persona changes.
    if (route && route.type === "inbox") {
      refreshNotifications().catch(() => {});
      if (typeof loadDmThreads === "function") {
        loadDmThreads().catch(() => {});
      }
      if (typeof loadDmFriends === "function") {
        loadDmFriends().catch(() => {});
      }
    }
    if (changed && route && route.type === "user") {
      loadCommunity({ soft: true }).catch(() => {});
    }
  }

  function personaOptions() {
    const options = [];
    if (publicUsername) {
      options.push({
        username: publicUsername,
        label: `@${publicUsername}`,
        isAlt: false,
        displayName: displayName || "",
        avatarUrl: avatarUrl || "",
      });
    }
    (alts || []).forEach((alt) => {
      options.push({
        username: alt.username,
        label: `@${alt.username}`,
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
    paintAvatar(document.getElementById("comment-avatar"), faceUrl, label);
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
              <span>${escapeHtml(opt.label || `@${opt.username}`)}</span>
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
    actionsHost.innerHTML = `<button class="btn btn-primary btn-compact reddit-join-btn reddit-join-orange" type="button" id="join-community-btn" hidden>Join</button>`;
  }

  const BANNER_CROP = {
    shape: "banner",
    title: "Crop community banner",
    hint: "Drag to frame the wide banner. Zoom to scale. The rectangle is what members will see.",
    aspectRatio: 3,
    outputWidth: 1500,
    outputHeight: 500,
    maxWidth: 1500,
    maxHeight: 500,
    mime: "image/jpeg",
    quality: 0.9,
  };

  function setBannerMode(mode, visible, group = null) {
    const banner = document.getElementById("view-banner");
    if (!banner) return null;
    banner.dataset.mode = mode || "";
    banner.hidden = !visible;
    const strip = document.getElementById("view-banner-strip");
    if (strip) {
      // Colored/image strip is for communities only — never on user profiles.
      const showStrip = visible && mode === "group";
      strip.hidden = !showStrip;
      strip.setAttribute("aria-hidden", showStrip ? "false" : "true");
      const bannerUrl = showStrip
        ? String((group && (group.bannerUrl || group.coverUrl || group.banner)) || "").trim()
        : "";
      if (bannerUrl) {
        strip.style.backgroundImage = `url("${bannerUrl.replace(/\\/g, "\\\\").replace(/"/g, "%22")}")`;
        strip.classList.add("has-image");
      } else {
        strip.style.backgroundImage = "";
        strip.classList.remove("has-image");
      }
    }
    if (mode !== "group" || !visible) syncGroupBannerForm(null);
    return banner;
  }

  function canManageGroup(group) {
    if (!group) return false;
    if (group.isOfficial || group.slug === "synk") return canManageSynkServer(group);
    const myId = me && (me.profileId || me.id || "");
    if (group.createdBy && myId && String(group.createdBy) === String(myId)) return true;
    return !!(me && (me.isStaff || me.isOwner || me.role === "owner" || me.role === "admin"));
  }

  function syncGroupBannerForm(group) {
    const widget = document.getElementById("group-banner-widget");
    if (!widget) return;
    const show = !!(group && !isDiscordTheme(group) && canManageGroup(group));
    widget.hidden = !show;
    if (!show) return;
    const urlInput = document.getElementById("group-banner-url");
    const status = document.getElementById("group-banner-status");
    const preview = document.getElementById("group-banner-preview");
    const current = String((group && (group.bannerUrl || group.coverUrl || "")) || "").trim();
    if (urlInput && document.activeElement !== urlInput) urlInput.value = current;
    if (status && !status.dataset.keep) status.textContent = "";
    if (preview) {
      if (current) {
        preview.hidden = false;
        preview.style.backgroundImage = `url("${current.replace(/\\/g, "\\\\").replace(/"/g, "%22")}")`;
        preview.classList.add("has-image");
      } else {
        preview.hidden = true;
        preview.style.backgroundImage = "";
        preview.classList.remove("has-image");
      }
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  
  let groupsPageFilter = "joined"; // joined | discover | all
  let groupsPageQuery = "";

  function isGroupJoined(group) {
    if (!group) return false;
    return !!(group.joined || group.isMember || group.member);
  }

  function groupCardHtml(group) {
    const members =
      group.memberCount != null
        ? `${Number(group.memberCount).toLocaleString()} member${Number(group.memberCount) === 1 ? "" : "s"}`
        : "";
    const posts =
      group.postCount != null
        ? `${Number(group.postCount).toLocaleString()} post${Number(group.postCount) === 1 ? "" : "s"}`
        : "";
    const meta = [group.name || group.slug || "", members || posts].filter(Boolean).join(" · ");
    const initial = String(group.slug || group.name || "?").slice(0, 1).toUpperCase();
    const joined = isGroupJoined(group);
    const desc = String(group.description || "").trim();
    const official = !!(group.isOfficial || group.slug === "synk");
    const joinLabel = joined ? "Joined" : "Join";
    return `<article class="community-group-card${joined ? " is-joined" : ""}${official ? " is-official" : ""}" data-group-card="${escapeHtml(group.slug)}">
      <a class="community-group-card-link" href="/community/group/${escapeHtml(group.slug)}" data-group="${escapeHtml(group.slug)}">
        <span class="community-group-card-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
        <span class="community-group-card-main">
          <strong class="community-group-card-name">${escapeHtml(group.name || group.slug)}${official ? `<span class="community-group-official">Official</span>` : ""}</strong>
          <span class="community-group-card-meta muted">${escapeHtml(meta)}</span>
          ${desc ? `<span class="community-group-card-desc muted">${escapeHtml(desc)}</span>` : ""}
        </span>
      </a>
      <button class="community-group-card-pill${joined ? "" : " is-ghost"}" type="button" data-join-group="${escapeHtml(group.slug)}" aria-pressed="${joined ? "true" : "false"}">${escapeHtml(joinLabel)}</button>
    </article>`;
  }

  function renderGroupsPage() {
    const host = document.getElementById("feed") || document.getElementById("feed-list") || document.getElementById("posts-list");
    if (!host) return;
    if (feedEmpty) feedEmpty.hidden = true;
    try {
      syncSortTabs();
      syncFeedChrome();
    } catch (_) {}
    const list = Array.isArray(groups) ? groups.slice() : [];
    const q = String(groupsPageQuery || "").trim().toLowerCase();
    const filtered = list.filter((g) => {
      if (!g) return false;
      if (!q) return true;
      const hay = `${g.slug || ""} ${g.name || ""} ${g.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
    const joined = filtered.filter((g) => isGroupJoined(g));
    const other = filtered.filter((g) => !isGroupJoined(g));
    const rankedOther = other
      .slice()
      .sort((a, b) => Number(b.postCount || 0) - Number(a.postCount || 0) || String(a.name || "").localeCompare(String(b.name || "")));
    const rankedJoined = joined
      .slice()
      .sort((a, b) => String(a.name || a.slug || "").localeCompare(String(b.name || b.slug || "")));

    const filter = groupsPageFilter === "discover" || groupsPageFilter === "all" ? groupsPageFilter : "joined";
    const showJoined = filter === "joined" || filter === "all";
    const showDiscover = filter === "discover" || filter === "all";

    let html = `<div class="community-groups-toolbar">
      <div class="community-groups-filters" role="tablist" aria-label="Group filters">
        <button type="button" class="community-groups-filter${filter === "joined" ? " is-active" : ""}" data-groups-filter="joined" role="tab" aria-selected="${filter === "joined" ? "true" : "false"}">Joined${list.filter(isGroupJoined).length ? ` · ${list.filter(isGroupJoined).length}` : ""}</button>
        <button type="button" class="community-groups-filter${filter === "discover" ? " is-active" : ""}" data-groups-filter="discover" role="tab" aria-selected="${filter === "discover" ? "true" : "false"}">Discover</button>
        <button type="button" class="community-groups-filter${filter === "all" ? " is-active" : ""}" data-groups-filter="all" role="tab" aria-selected="${filter === "all" ? "true" : "false"}">All</button>
      </div>
      <label class="community-groups-search">
        <span class="sr-only">Search groups</span>
        <input type="search" id="groups-page-search" placeholder="Search groups" value="${escapeHtml(groupsPageQuery)}" autocomplete="off" />
      </label>
    </div>`;

    if (!list.length) {
      host.innerHTML = html;
      if (feedEmpty) {
        feedEmpty.hidden = false;
        feedEmpty.innerHTML = `<div class="reddit-empty-ico" aria-hidden="true">${ico("users", 28)}</div><strong>No groups yet</strong><p>Communities will show up here once they’re available.</p>`;
      }
      return;
    }

    let body = "";
    if (showJoined) {
      if (rankedJoined.length) {
        body += `<p class="search-section-title">Joined</p>`;
        body += rankedJoined.map(groupCardHtml).join("");
      } else if (filter === "joined") {
        body += `<div class="community-groups-empty">
          <strong>You haven’t joined any groups yet</strong>
          <p class="muted">Browse Discover to find communities that fit you.</p>
          <button type="button" class="btn btn-primary btn-compact reddit-join-orange" data-groups-filter="discover">Explore groups</button>
        </div>`;
      }
    }
    if (showDiscover) {
      if (rankedOther.length) {
        body += `<p class="search-section-title">${filter === "all" && rankedJoined.length ? "Discover" : filter === "discover" ? "Discover" : "Communities"}</p>`;
        body += rankedOther.map(groupCardHtml).join("");
      } else if (filter === "discover") {
        body += `<div class="community-groups-empty">
          <strong>${q ? "No matching groups" : "You’re in everything"}</strong>
          <p class="muted">${q ? "Try a different search." : "You’ve already joined every available community."}</p>
        </div>`;
      }
    }
    if (!body && q) {
      body = `<div class="community-groups-empty"><strong>No matches</strong><p class="muted">Nothing matched “${escapeHtml(groupsPageQuery)}”.</p></div>`;
    }

    host.innerHTML = html + body;
    const searchInput = document.getElementById("groups-page-search");
    if (searchInput && document.activeElement !== searchInput) {
      // keep caret only when user isn't typing; value already set above
    }
  }

  function renderGroups() {
    // Groups stay off the left sidebar — browse them from Feed / Your groups.
    if (groupList) {
      groupList.innerHTML = "";
      groupList.hidden = true;
    }
    if (homeLink) homeLink.classList.toggle("is-active", route.type === "home");
    if (popularLink) popularLink.classList.toggle("is-active", route.type === "popular");
    renderRecent();
    if (!postGroup) return;
    postGroup.innerHTML = groups
      .map((group) => `<option value="${escapeHtml(group.slug)}">${escapeHtml(group.name || group.slug)}</option>`)
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
      altList.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No additional accounts yet.</p>';
      return;
    }
    altList.innerHTML = alts
      .map(
        (alt) => `
          <div class="community-staff-row">
            <div>
              <a class="community-user-link" href="/user/${escapeHtml(alt.username)}">${escapeHtml(alt.username)}</a>
              <span class="muted" style="font-size:0.78rem;">@${escapeHtml(alt.username)}</span>
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

  function popularDiscoverHtml(data = {}) {
    const groupSource = Array.isArray(data.groups) ? data.groups : Array.isArray(groups) ? groups : [];
    const rankedGroups = groupSource
      .slice()
      .sort((a, b) => Number(b.postCount || 0) - Number(a.postCount || 0))
      .slice(0, 6);
    const users = Array.isArray(data.users) ? data.users.slice(0, 6) : [];
    let html = "";
    if (users.length) {
      html += `<p class="search-section-title">People</p>`;
      html += users
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
    if (rankedGroups.length) {
      html += `<p class="search-section-title">Popular groups</p>`;
      html += rankedGroups
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
    }
    return html;
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
        feedEmpty.innerHTML = query ? `<strong>No people found</strong>Nothing matched “${escapeHtml(query)}”.` : `<strong>Find people</strong>Search by username to connect with members.`;
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
              subtitle: `@${u.username || ""}`,
            })
          )
          .join("");
      return;
    }

    if (tab === "groups") {
      if (!matchedGroups.length) {
        feedEl.innerHTML = "";
        feedEmpty.hidden = false;
        feedEmpty.innerHTML = query ? `<strong>No groups found</strong>Nothing matched “${escapeHtml(query)}”.` : `<strong>Find groups</strong>Search by name to discover communities.`;
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
      const discover = !query ? popularDiscoverHtml(data) : "";
      if (discover) {
        feedEmpty.hidden = true;
        feedEl.innerHTML = `<p class="search-section-title">Suggested</p>${discover}`;
        syncFeedChrome();
        return;
      }
      feedEl.innerHTML = "";
      if (feedEmpty) {
        feedEmpty.hidden = false;
        feedEmpty.innerHTML = query
          ? `<strong>No matches</strong>Nothing turned up for “${escapeHtml(query)}”. Try another name or topic.`
          : `<strong>Search Community</strong>Find people, groups, and posts. Popular groups appear as you explore.`;
      }
      syncFeedChrome();
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


  function isSuggestionsChannel(channel) {
    if (!channel) return false;
    const kind = String(channel.kind || "").toLowerCase();
    const slug = String(channel.slug || "").toLowerCase();
    return kind === "suggestions" || slug === "ideas" || slug === "suggestions";
  }

  function activeGroupIsForum() {
    if (route.type !== "group") return false;
    const group = activeGroupDetail || {};
    const channels = Array.isArray(group.channels) ? group.channels : [];
    const active = channels.find((c) => c.slug === activeChannelSlug) || null;
    return isSuggestionsChannel(active) || !!(active && active.isForum);
  }

  function suggestionStatusLabel(status) {
    const key = String(status || "open").toLowerCase();
    return SUGGESTION_STATUS_LABELS[key] || "Open";
  }

  function renderSuggestionTagChips(tags) {
    const list = Array.isArray(tags) ? tags : [];
    if (!list.length) return "";
    return `<div class="forum-tags">${list
      .map((tag) => {
        const id = String((tag && tag.id) || tag || "");
        const meta = SUGGESTION_TAGS.find((t) => t.id === id) || tag || { id, label: id, color: "#99AAB5" };
        const label = escapeHtml(meta.label || meta.id || id);
        const color = escapeHtml(meta.color || "#99AAB5");
        return `<span class="forum-tag" style="--forum-tag:${color}">${label}</span>`;
      })
      .join("")}</div>`;
  }

  function sortedForumPosts(posts) {
    return (Array.isArray(posts) ? posts.slice() : []).sort((a, b) => {
      const pin = Number(!!b.isPinned) - Number(!!a.isPinned);
      if (pin) return pin;
      if (currentSort === "top" || currentSort === "hot") {
        const score = (Number(b.score) || 0) - (Number(a.score) || 0);
        if (score) return score;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }

  function renderForumFeed(posts) {
    const ordered = sortedForumPosts(posts).filter((p) => !p.hidden);
    if (!ordered.length) {
      feedEl.innerHTML = `<div class="forum-empty">
        <strong>No suggestions yet</strong>
        <p class="muted">Tap + to post an idea. Staff can pin a rules post at the top.</p>
      </div>`;
      return;
    }
    feedEl.innerHTML = `<div class="forum-thread-list">${ordered
      .map((post) => {
        const author = post.author || {};
        const title = postTitle(post);
        const bodyText = postBodyText(post);
        const vote = Number(post.myVote) || 0;
        const score = displayScore(post);
        const comments = Number(post.commentCount) || 0;
        const pid = escapeHtml(String(post.id || ""));
        const status = String(post.suggestionStatus || "open").toLowerCase();
        const reply = String(post.suggestionReply || "").trim();
        return `
          <article class="forum-thread ${post.isPinned ? "is-pinned" : ""} is-${escapeHtml(status)}" data-post-id="${pid}">
            <div class="forum-thread-votes" aria-label="Vote">
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">${ico("up", 18)}</button>
              <span class="reddit-vote-count ${vote === 1 ? "is-up" : vote === -1 ? "is-down" : ""}">${score}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">${ico("down", 18)}</button>
            </div>
            <a class="forum-thread-main" href="/community/post/${pid}" data-open-post="${pid}">
              <div class="forum-thread-top">
                ${post.isPinned ? `<span class="forum-pin">Pinned</span>` : ""}
                <span class="suggestion-status is-${escapeHtml(status)}">${escapeHtml(suggestionStatusLabel(status))}</span>
                ${renderSuggestionTagChips(post.suggestionTags)}
              </div>
              <h3 class="forum-thread-title">${escapeHtml(title)}</h3>
              ${bodyText ? `<p class="forum-thread-preview">${escapeHtml(truncateText(bodyText, 140))}</p>` : ""}
              ${reply ? `<p class="forum-thread-reply"><strong>Staff:</strong> ${escapeHtml(reply)}</p>` : ""}
              <div class="forum-thread-meta">
                ${renderAuthorLink(author, { withAvatar: true })}
                <span class="reddit-meta-dot">•</span>
                <time>${escapeHtml(formatRelative(post.createdAt))}</time>
                <span class="reddit-meta-dot">•</span>
                <span>${comments} reply${comments === 1 ? "" : "ies"}</span>
              </div>
            </a>
          </article>`;
      })
      .join("")}</div>`;
  }

  function renderFeed(posts) {
    lastPosts = Array.isArray(posts) ? posts.slice() : [];
    if (activeGroupIsForum()) {
      if (feedEmpty) feedEmpty.hidden = true;
      syncSortTabs();
      syncFeedChrome();
      document.body.classList.add("is-forum-channel");
      renderForumFeed(lastPosts);
      return;
    }
    document.body.classList.remove("is-forum-channel");
    const ordered = sortedPosts(lastPosts).filter((p) => !p.hidden);
    if (!ordered.length) {
      feedEl.innerHTML = "";
      if (feedEmpty) {
        feedEmpty.hidden = false;
        if (route.type === "group" && activeChannelSlug) {
          feedEmpty.innerHTML = `<div class="reddit-empty-ico" aria-hidden="true">${ico("comment", 28)}</div><strong>This channel is quiet</strong><p>Be the first to share something here.</p>`;
        } else if (route.type === "group") {
          feedEmpty.innerHTML = `<div class="reddit-empty-ico" aria-hidden="true">${ico("create", 28)}</div><strong>No posts in this group yet</strong><p>Share something to get the conversation started.</p><div class="community-empty-actions"><a class="btn btn-primary btn-compact reddit-join-orange" href="/community/submit?group=${encodeURIComponent(route.slug || "")}">Create post</a></div>`;
        } else if (route.type === "popular") {
          feedEmpty.innerHTML = `<div class="reddit-empty-ico" aria-hidden="true">${ico("popular", 28)}</div><strong>Nothing trending right now</strong><p>Check back soon, or explore groups for something new.</p><div class="community-empty-actions"><a class="btn btn-secondary btn-compact" href="/community/groups">Browse groups</a></div>`;
        } else {
          feedEmpty.innerHTML = `<div class="reddit-empty-ico" aria-hidden="true">${ico("feed", 28)}</div><strong>Your feed is ready</strong><p>Join groups or post an update to see activity here.</p><div class="community-empty-actions"><a class="btn btn-primary btn-compact reddit-join-orange" href="/community/groups">Browse groups</a><a class="btn btn-secondary btn-compact" href="/community/submit">New post</a></div>`;
        }
      }
      syncFeedChrome();
      return;
    }
    if (feedEmpty) feedEmpty.hidden = true;
    syncSortTabs();
    syncFeedChrome();
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
              suggestionStatusLabel(suggestionStatus || "open")
            )}</span>${renderSuggestionTagChips(post.suggestionTags)}`
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
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">${ico("up", 20)}</button>
              <span class="reddit-vote-count ${vote === 1 ? "is-up" : vote === -1 ? "is-down" : ""}">${score}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">${ico("down", 20)}</button>
            </div>
            <div class="reddit-post-main">
              <div class="reddit-post-meta">
                ${
                  showGroup
                    ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.name || group.slug)}</a>`
                    : `<span class="reddit-sub is-static">Home</span>`
                }
                <span class="reddit-meta-dot">•</span>
                <span class="reddit-meta-by">Posted by</span>
                ${renderAuthorLink(author, { withAvatar: true })}
                <span class="reddit-meta-dot">•</span>
                <time class="reddit-meta-time">${escapeHtml(formatRelative(post.createdAt))}</time>
                ${
                  post.channel && post.channel.label
                    ? `<span class="reddit-meta-dot">•</span><span class="reddit-channel-pill">${escapeHtml(
                        formatChannelLabel(post.channel)
                      )}</span>`
                    : ""
                }
                ${statusBadge}
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
    const commentLabel = comments === 1 ? "1 comment" : `${comments} comments`;
    const pid = escapeHtml(String(post.id || ""));
    const media = renderPostMedia(post, { large: true });
    const suggestionStatus = String(post.suggestionStatus || "").toLowerCase();
    const isSuggestion =
      suggestionStatus ||
      (post.channel && String(post.channel.kind || "").toLowerCase() === "suggestions");
    const canModerateSuggestion = !!(
      isSuggestion &&
      me &&
      (me.isStaff || me.role === "owner" || me.role === "admin")
    );
    const reply = String(post.suggestionReply || "").trim();
    const statusBadge = isSuggestion
      ? `<span class="suggestion-status is-${escapeHtml(suggestionStatus || "open")}">${escapeHtml(
          suggestionStatusLabel(suggestionStatus || "open")
        )}</span>${renderSuggestionTagChips(post.suggestionTags)}`
      : "";
    const staffPanel = canModerateSuggestion
      ? `<div class="forum-staff-panel">
          <p class="forum-staff-title">Staff reply</p>
          <div class="forum-staff-presets">
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="accepted" data-suggestion-reply="Yes — we'll do this" data-post-id="${pid}">Yes</button>
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="denied" data-suggestion-reply="No — not planned" data-post-id="${pid}">No</button>
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="implemented" data-suggestion-reply="Already implemented" data-post-id="${pid}">Already implemented</button>
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="planned" data-suggestion-reply="Planned" data-post-id="${pid}">Planned</button>
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="closed" data-suggestion-reply="Closed" data-post-id="${pid}">Close</button>
            <button type="button" class="btn btn-secondary btn-compact" data-suggestion-status="open" data-suggestion-reply="" data-post-id="${pid}">Reopen</button>
          </div>
          <form class="forum-staff-form" data-suggestion-form="${pid}">
            <label class="sr-only" for="suggestion-reply-${pid}">Custom reply</label>
            <textarea id="suggestion-reply-${pid}" rows="2" maxlength="500" placeholder="Custom reply (optional)…">${escapeHtml(reply)}</textarea>
            <div class="forum-staff-form-actions">
              <select data-suggestion-status-select aria-label="Status">
                <option value="open" ${suggestionStatus === "open" ? "selected" : ""}>Open</option>
                <option value="planned" ${suggestionStatus === "planned" ? "selected" : ""}>Planned</option>
                <option value="accepted" ${suggestionStatus === "accepted" ? "selected" : ""}>Accepted</option>
                <option value="implemented" ${suggestionStatus === "implemented" ? "selected" : ""}>Implemented</option>
                <option value="denied" ${suggestionStatus === "denied" ? "selected" : ""}>Denied</option>
                <option value="closed" ${suggestionStatus === "closed" ? "selected" : ""}>Closed</option>
              </select>
              <button class="btn btn-primary btn-compact" type="submit">Save reply</button>
              <button class="btn btn-secondary btn-compact" type="button" data-pin-post="${pid}" data-pinned="${post.isPinned ? "0" : "1"}">${post.isPinned ? "Unpin" : "Pin"}</button>
            </div>
          </form>
        </div>`
      : reply
        ? `<div class="forum-staff-reply"><strong>Staff:</strong> ${escapeHtml(reply)}</div>`
        : "";
    el.innerHTML = `
      <article class="reddit-post reddit-post-detail-inner ${isSuggestion ? "is-suggestion" : ""}" data-post-id="${pid}">
        <div class="reddit-vote">
          <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">${ico("up", 20)}</button>
          <span class="reddit-vote-count ${vote === 1 ? "is-up" : vote === -1 ? "is-down" : ""}">${displayScore(post)}</span>
          <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">${ico("down", 20)}</button>
        </div>
        <div class="reddit-post-main">
          <div class="reddit-post-meta">
            ${
              group.slug
                ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.name || group.slug)}</a>`
                : `<span class="reddit-sub is-static">Home</span>`
            }
            <span class="reddit-meta-dot">•</span>
            <span class="reddit-meta-by">Posted by</span>
            ${renderAuthorLink(author, { withAvatar: true })}
            <span class="reddit-meta-dot">•</span>
            <time class="reddit-meta-time">${escapeHtml(formatRelative(post.createdAt))}</time>
            ${statusBadge}
            ${post.isPinned ? `<span class="forum-pin">Pinned</span>` : ""}
          </div>
          <h1 class="reddit-post-title reddit-post-title-lg">${escapeHtml(title)}</h1>
          ${bodyText ? `<div class="reddit-post-body reddit-post-body-lg">${escapeHtml(bodyText)}</div>` : ""}
          ${media}
          ${staffPanel}
          <div class="reddit-post-actions">
            <span class="reddit-action">${ico("comment", 16)} <span>${escapeHtml(commentLabel)}</span></span>
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
        empty.innerHTML = `<strong>No comments yet</strong><p class="muted">Be the first to share what you think.</p>`;
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
            <div class="reddit-vote reddit-vote-sm" aria-label="Vote">
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="comment" data-comment-id="${cid}" aria-label="Upvote">${ico("up", 16)}</button>
              <span class="reddit-vote-count ${vote === 1 ? "is-up" : vote === -1 ? "is-down" : ""}">${Number(comment.score) || 0}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="comment" data-comment-id="${cid}" aria-label="Downvote">${ico("down", 16)}</button>
            </div>
            <div class="reddit-comment-main">
              <div class="reddit-post-meta">
                ${renderAuthorLink(author, { withAvatar: true })}
                <span class="reddit-meta-dot">•</span>
                <time class="reddit-meta-time">${escapeHtml(formatRelative(comment.createdAt))}</time>
              </div>
              <div class="reddit-comment-body">${escapeHtml(comment.body || "")}</div>
              <div class="reddit-post-actions reddit-comment-actions">
                <button class="reddit-action" type="button" disabled title="Coming soon">${ico("comment", 14)} <span>Reply</span></button>
                <button class="reddit-action" type="button" data-share-comment="${cid}">${ico("share", 14)} <span>Share</span></button>
              </div>
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

  function isAppUpdateKind(kind) {
    const k = normalizeNotifKind(kind);
    return k === "app_update" || k === "app_updated" || k === "update";
  }

  // Belt-and-suspenders: keep a single release-note row in the inbox UI.
  function collapseAppUpdateNotes(notes) {
    const list = Array.isArray(notes) ? notes.slice() : [];
    const kept = [];
    let appUpdate = null;
    for (const note of list) {
      if (isAppUpdateKind(note && note.kind)) {
        if (!appUpdate) {
          appUpdate = {
            ...note,
            title: note.title || "App updated",
            description:
              note.description ||
              note.body ||
              "Synk was updated. Open release notes for what’s new.",
            body:
              note.body ||
              note.description ||
              "Synk was updated. Open release notes for what’s new.",
          };
          kept.push(appUpdate);
        } else {
          if (appUpdate.readAt && !note.readAt) appUpdate.readAt = null;
          if (!appUpdate.version && note.version) appUpdate.version = note.version;
          if (new Date(note.createdAt || 0) > new Date(appUpdate.createdAt || 0)) {
            appUpdate.createdAt = note.createdAt;
            if (note.version) appUpdate.version = note.version;
            if (note.description || note.body) {
              appUpdate.description = note.description || note.body;
              appUpdate.body = note.body || note.description;
            }
          }
        }
        continue;
      }
      kept.push(note);
    }
    kept.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return kept;
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
    lastNotifications = collapseAppUpdateNotes(notifications);
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
        const unread = !(note.readAt || note.read_at);
        const postId = note.postId ? escapeHtml(String(note.postId)) : "";
        const actions = renderNotifActions(note, meta);
        const actor = String(note.actorUsername || "").trim() || "Someone";
        const avatar = avatarMarkup(note.actorAvatarUrl || "", actor, "community-face reddit-inbox-avatar");
        const openAttr =
          postId && meta.kind !== "friend_request"
            ? `data-open-post="${postId}" data-inbox-id="${nid}"`
            : "";
        return `
          <article class="reddit-inbox-row ${unread ? "is-unread" : ""}" data-inbox-id="${nid}" ${openAttr}>
            ${avatar}
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
    const onFeed = !onSettings && !onSubmit && !onMod && !onPost && !onInbox && !onGroups;
    if (feedView) feedView.hidden = needsUsername || !(onFeed || onGroups);
    if (settingsView) settingsView.hidden = needsUsername || !onSettings;
    if (submitView) submitView.hidden = needsUsername || !onSubmit;
    if (modView) modView.hidden = needsUsername || !onMod;
    if (postView) postView.hidden = needsUsername || !onPost;
    if (inboxView) inboxView.hidden = needsUsername || !onInbox;
    if (composerCard) {
      composerCard.hidden =
        needsUsername || !onFeed || onGroups || route.type === "user" || route.type === "search";
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
      const account = activeAccountProfile();
      const gateInput = document.getElementById("public-username");
      if (gateInput) gateInput.value = publicUsername;
      if (settingsUsername) {
        settingsUsername.value = account.username || publicUsername;
        settingsUsername.readOnly = false;
        settingsUsername.title = "";
      }
      const usernameBtn = document.getElementById("settings-username-btn");
      if (usernameBtn) usernameBtn.hidden = false;
      const settingsLead = document.querySelector(".reddit-settings-lead");
      if (settingsLead) {
        settingsLead.textContent =
          "Manage how you appear in Community. Your legal name remains private.";
      }
      const settingsDisplay = document.getElementById("settings-display-name");
      if (settingsDisplay) settingsDisplay.value = account.displayName || "";
      const settingsBio = document.getElementById("settings-bio");
      if (settingsBio && document.activeElement !== settingsBio) {
        settingsBio.value = account.bio || "";
      }
      const settingsDm = document.getElementById("settings-dm-policy");
      if (settingsDm) settingsDm.value = account.dmPolicy || "friends";
      const settingsPresence = document.getElementById("settings-presence-status");
      if (settingsPresence) settingsPresence.value = normalizePresenceStatus(account.presenceStatus || "online");
      if (myProfileLink) {
        myProfileLink.hidden = false;
        myProfileLink.href = `/user/${encodeURIComponent(account.username || publicUsername)}`;
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
          menuProfileLink.href = `/user/${encodeURIComponent(actingUsername() || publicUsername)}`;
          menuProfileLink.hidden = false;
        }
        syncMenuPresenceUi(account.presenceStatus || presenceStatus || "online");
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
    const mobile = !(window.matchMedia && window.matchMedia("(min-width: 1101px)").matches);
    const show = !!(me && publicUsername && mobile);
    bar.hidden = !show;
    document.body.classList.toggle("has-community-tabbar", show);
    const meTab = document.getElementById("tab-me");
    if (meTab && publicUsername) {
      meTab.href = `/user/${encodeURIComponent(actingUsername() || publicUsername)}`;
    }
    let tab = "home";
    if (route.type === "popular") tab = "popular";
    else if (route.type === "submit") tab = "submit";
    else if (route.type === "inbox") tab = "inbox";
    else if (
      route.type === "user" &&
      (actingUsername() || publicUsername) &&
      route.username === (actingUsername() || publicUsername)
    ) {
      tab = "me";
    }
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

  function formatChannelLabel(ch, { compact = false } = {}) {
    if (!ch) return "";
    // Prefer plain professional names; icons are rendered separately in the channel rail.
    let name = "";
    if (ch.label) {
      const parts = String(ch.label).split("|");
      if (parts.length >= 2) {
        name = capitalizeChannelName(parts.slice(1).join("|").trim());
      } else {
        name = capitalizeChannelName(ch.label);
      }
    } else {
      name = capitalizeChannelName(ch.name || ch.slug || "");
    }
    if (!name) return "";
    return compact ? name : name;
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

  function channelKindMeta(channel) {
    const kind = String((channel && channel.kind) || "").toLowerCase();
    const slug = String((channel && channel.slug) || "").toLowerCase();
    if (kind === "announcements" || slug === "announcements") {
      return { label: "Announcements", icon: "megaphone", tone: "announce" };
    }
    if (kind === "suggestions" || slug === "ideas" || slug === "suggestions") {
      return { label: "Ideas", icon: "lightbulb", tone: "suggest" };
    }
    if (slug === "rules" || kind === "rules") {
      return { label: "Rules", icon: "scroll", tone: "rules" };
    }
    if (slug === "welcome" || slug === "info" || kind === "info") {
      return { label: "Welcome", icon: "info", tone: "info" };
    }
    if (kind === "readonly") {
      return { label: "Info", icon: "info", tone: "info" };
    }
    if (kind === "help" || slug === "help") {
      return { label: "Help", icon: "lifeBuoy", tone: "help" };
    }
    if (slug === "bugs") {
      return { label: "", icon: "bug", tone: "bugs" };
    }
    if (slug === "general" || slug === "lounge" || kind === "text" || kind === "chat") {
      return { label: "", icon: "hash", tone: "chat" };
    }
    return { label: "", icon: "hash", tone: "chat" };
  }

  function channelButtonHtml(ch) {
    const on = ch.slug === activeChannelSlug ? "is-active" : "";
    const name = formatChannelLabel(ch) || capitalizeChannelName(ch.slug || "channel");
    const kind = String(ch.kind || "chat").toLowerCase();
    const meta = channelKindMeta(ch);
    const tone = meta.tone || "chat";
    const title = meta.label ? `${name} · ${meta.label}` : name;
    return `<button type="button" class="discord-channel-btn synk-hub-channel ${on}" data-discord-channel="${escapeHtml(
      ch.slug
    )}" data-kind="${escapeHtml(kind)}" data-tone="${escapeHtml(tone)}" title="${escapeHtml(title)}"><span class="synk-hub-channel-ico" aria-hidden="true">${ico(
      meta.icon || "hash",
      15
    )}</span><span class="discord-channel-label">${escapeHtml(name)}</span></button>`;
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

  function isSynkChannelsPhone() {
    try {
      return !!(window.matchMedia && window.matchMedia("(max-width: 767px)").matches);
    } catch (_) {
      return false;
    }
  }

  function setSynkChannelsOpen(open, opts = {}) {
    const shell = document.getElementById("discord-shell");
    const backdrop = document.getElementById("synk-hub-backdrop");
    const toggle = document.getElementById("synk-channels-toggle");
    const want = !!open;
    const phone = isSynkChannelsPhone();
    const persist = opts.persist !== false;
    if (phone) {
      document.body.classList.toggle("synk-channels-open", want);
      document.body.classList.remove("synk-channels-collapsed");
      if (shell) shell.classList.toggle("is-channels-open", want);
      if (backdrop) backdrop.hidden = !want;
    } else {
      // Tablet/desktop: rail is open by default; collapse is opt-in.
      document.body.classList.toggle("synk-channels-collapsed", !want);
      document.body.classList.remove("synk-channels-open");
      if (shell) shell.classList.remove("is-channels-open");
      if (backdrop) backdrop.hidden = true;
      if (persist) {
        try {
          localStorage.setItem("synk-hub-channels-collapsed", want ? "0" : "1");
        } catch (_) {}
      }
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", want ? "true" : "false");
      toggle.setAttribute("aria-label", want ? "Hide channels" : "Show channels");
    }
  }

  function syncSynkChannelsForViewport() {
    if (!document.body.classList.contains("is-discord-group")) {
      document.body.classList.remove("synk-channels-open", "synk-channels-collapsed");
      return;
    }
    if (isSynkChannelsPhone()) {
      // Keep drawer closed unless the user already opened it.
      if (!document.body.classList.contains("synk-channels-open")) setSynkChannelsOpen(false);
      return;
    }
    let collapsed = false;
    try {
      collapsed = localStorage.getItem("synk-hub-channels-collapsed") === "1";
    } catch (_) {}
    setSynkChannelsOpen(!collapsed);
  }

  function renderDiscordChannels(group) {
    const shell = document.getElementById("discord-shell");
    const host = document.getElementById("discord-channel-list") || document.getElementById("discord-channels");
    if (!shell || !host) return;
    if (!isDiscordTheme(group)) {
      shell.hidden = true;
      document.body.classList.remove("is-discord-group", "synk-channels-open", "synk-channels-collapsed");
      setSynkChannelsOpen(false, { persist: false });
      mountFeedStack(false);
      return;
    }
    document.body.classList.add("is-discord-group");
    shell.hidden = false;
    mountFeedStack(true);
    syncSynkChannelsForViewport();
    const categories = Array.isArray(group.categories) ? group.categories.slice() : [];
    categories.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const channels = Array.isArray(group.channels) ? group.channels.slice() : [];
    if (!activeChannelSlug) {
      const general =
        channels.find((c) => c.slug === "general") ||
        channels.find((c) => c.slug === "lounge") ||
        channels.find((c) => c.slug === "welcome");
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
      if (!list.length) continue;
      html.push(`<div class="discord-cat synk-hub-cat">${escapeHtml(cat.name)}</div>`);
      list
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
        .forEach((ch) => html.push(channelButtonHtml(ch)));
    }
    if (loose.length) {
      html.push(`<div class="discord-cat synk-hub-cat">More</div>`);
      loose
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
        .forEach((ch) => html.push(channelButtonHtml(ch)));
    }
    host.innerHTML = html.join("") || `<p class="muted synk-hub-empty-channels">No channels yet.</p>`;
    const railTitle = document.getElementById("synk-hub-rail-title") || document.querySelector(".synk-hub-rail-title");
    if (railTitle && group && group.name) railTitle.textContent = group.name;
    const railSub = document.getElementById("synk-hub-rail-sub") || document.querySelector(".synk-hub-rail-sub");
    if (railSub) {
      const members = group && group.memberCount != null ? Number(group.memberCount) : null;
      if (members != null && Number.isFinite(members)) {
        railSub.textContent = `${members.toLocaleString()} member${members === 1 ? "" : "s"} · Official`;
      } else {
        railSub.textContent = "Official server";
      }
    }
    const railMark = document.getElementById("synk-hub-rail-mark") || document.querySelector(".synk-hub-rail-mark");
    if (railMark) paintServerIcon(railMark, group);
    const bannerArt = document.getElementById("synk-hub-server-banner-art");
    if (bannerArt) {
      const custom = String((group && (group.bannerUrl || group.coverUrl || group.banner)) || "").trim();
      if (custom) {
        bannerArt.style.backgroundImage = `url("${custom.replace(/"/g, "%22")}")`;
        bannerArt.classList.add("has-image");
      } else {
        bannerArt.style.backgroundImage = "";
        bannerArt.classList.remove("has-image");
      }
    }
    const active = channels.find((c) => c.slug === activeChannelSlug) || channels[0] || null;
    const title = document.getElementById("discord-channel-title");
    const desc = document.getElementById("discord-channel-desc");
    const kindEl = document.getElementById("discord-channel-kind");
    const activeMeta = channelKindMeta(active);
    if (title) {
      const label = active ? formatChannelLabel(active, { compact: true }) : "Synk";
      const cleaned = String(label || "").replace(/^[^\s]+\s+/, "").trim() || label || "Synk";
      const iconName = (activeMeta && activeMeta.icon) || "hash";
      title.innerHTML = `<span class="synk-hub-title-ico" aria-hidden="true">${ico(iconName, 16)}</span><span class="synk-hub-title-text"># ${escapeHtml(cleaned)}</span>`;
    }
    if (kindEl) {
      const kindLabel = activeMeta && activeMeta.label ? activeMeta.label : "";
      kindEl.textContent = kindLabel;
      kindEl.hidden = !kindLabel;
      if (activeMeta && activeMeta.tone) kindEl.setAttribute("data-tone", activeMeta.tone);
      else kindEl.removeAttribute("data-tone");
    }
    if (desc) {
      const text = (active && (active.description || "")) || "";
      desc.textContent = text;
      desc.hidden = !text;
      desc.title = text;
    }
    const composerOpen = document.getElementById("composer-open-btn");
    const forumCreateBtn = document.getElementById("synk-hub-forum-create");
    const isForum = isSuggestionsChannel(active);
    document.body.classList.toggle("is-forum-channel", !!isForum);
    if (forumCreateBtn) {
      const allowed = canPostInChannel(active) && isForum;
      forumCreateBtn.hidden = !allowed;
    }
    if (composerOpen && route.slug) {
      const allowed = canPostInChannel(active) && !isForum;
      composerOpen.hidden = !allowed;
      if (allowed) {
        composerOpen.href = submitUrlForGroup(route.slug, activeChannelSlug);
        const kind = String((active && active.kind) || "").toLowerCase();
        if (kind === "announcements") composerOpen.textContent = "Post announcement";
        else composerOpen.textContent = "Message #"+ ((active && active.name) || activeChannelSlug || "channel");
      }
    }
    const feedHint = document.getElementById("discord-channel-hint");
    if (feedHint) {
      const kind = String((active && active.kind) || "").toLowerCase();
      if (kind === "announcements") {
        feedHint.hidden = false;
        feedHint.textContent = canPostInChannel(active)
          ? "Staff-only announcements."
          : "Staff announcements only.";
      } else if (kind === "readonly") {
        feedHint.hidden = false;
        feedHint.textContent = "Read-only — maintained by Synk staff.";
      } else if (kind === "suggestions" || isForum) {
        feedHint.hidden = false;
        feedHint.textContent = "Forum channel — post ideas, add tags, and vote. Staff can reply and close threads.";
      } else {
        feedHint.hidden = true;
        feedHint.textContent = "";
      }
    }
    try {
      const activeBtn = host.querySelector(".discord-channel-btn.is-active");
      if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
        activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } catch (_) {}
    renderSynkServerManage(group);
  }

  function canManageSynkServer(group) {
    if (!(group && (group.isOfficial || group.slug === "synk"))) return false;
    return !!(me && (me.isStaff || me.isOwner || me.role === "owner" || me.role === "admin"));
  }

  function resetSynkChannelForm() {
    const idEl = document.getElementById("synk-hub-channel-id");
    const nameEl = document.getElementById("synk-hub-channel-name");
    const slugEl = document.getElementById("synk-hub-channel-slug");
    const kindEl = document.getElementById("synk-hub-channel-kind");
    const catEl = document.getElementById("synk-hub-channel-category");
    const descEl = document.getElementById("synk-hub-channel-desc");
    const saveBtn = document.getElementById("synk-hub-channel-save");
    const resetBtn = document.getElementById("synk-hub-channel-reset");
    if (idEl) idEl.value = "";
    if (nameEl) nameEl.value = "";
    if (slugEl) slugEl.value = "";
    if (kindEl) kindEl.value = "text";
    if (catEl) catEl.value = "";
    if (descEl) descEl.value = "";
    if (saveBtn) saveBtn.textContent = "Add channel";
    if (resetBtn) resetBtn.hidden = true;
  }

  function fillSynkChannelForm(channel) {
    if (!channel) return resetSynkChannelForm();
    const idEl = document.getElementById("synk-hub-channel-id");
    const nameEl = document.getElementById("synk-hub-channel-name");
    const slugEl = document.getElementById("synk-hub-channel-slug");
    const kindEl = document.getElementById("synk-hub-channel-kind");
    const catEl = document.getElementById("synk-hub-channel-category");
    const descEl = document.getElementById("synk-hub-channel-desc");
    const saveBtn = document.getElementById("synk-hub-channel-save");
    const resetBtn = document.getElementById("synk-hub-channel-reset");
    if (idEl) idEl.value = channel.id || "";
    if (nameEl) nameEl.value = channel.name || "";
    if (slugEl) slugEl.value = channel.slug || "";
    if (kindEl) kindEl.value = String(channel.kind || "text").toLowerCase();
    if (catEl) {
      const cats = Array.isArray(activeGroupDetail && activeGroupDetail.categories)
        ? activeGroupDetail.categories
        : [];
      const match = cats.find((c) => String(c.id) === String(channel.categoryId || ""));
      catEl.value = (match && match.name) || "";
    }
    if (descEl) descEl.value = channel.description || "";
    if (saveBtn) saveBtn.textContent = "Save channel";
    if (resetBtn) resetBtn.hidden = false;
  }

  function paintServerIcon(el, group) {
    if (!el) return;
    const name = String((group && (group.name || group.slug)) || "S");
    const initial = name.trim().slice(0, 1).toUpperCase() || "S";
    const iconUrl = String((group && (group.iconUrl || group.avatarUrl || "")) || "").trim();
    if (iconUrl) {
      el.classList.add("has-image");
      el.innerHTML = `<img src="${escapeHtml(iconUrl)}" alt="" />`;
    } else {
      el.classList.remove("has-image");
      el.textContent = initial;
    }
  }

  function setServerSettingsOpen(open, tab) {
    const panel = document.getElementById("synk-hub-manage");
    if (!panel) return;
    panel.hidden = !open;
    document.body.classList.toggle("server-settings-open", !!open);
    if (open) {
      if (tab) setServerSettingsTab(tab);
      pendingServerIconData = "";
      clearServerIcon = false;
      const iconFile = document.getElementById("synk-hub-icon-file");
      if (iconFile) iconFile.value = "";
      renderSynkServerManage(activeGroupDetail);
    }
  }

  function setServerSettingsTab(tab) {
    const key = String(tab || "overview").toLowerCase() === "channels" ? "channels" : "overview";
    document.querySelectorAll("[data-server-settings-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-server-settings-tab") === key);
    });
    document.querySelectorAll("[data-server-settings-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-server-settings-panel") === key;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
  }

  function renderSynkServerManage(group) {
    const panel = document.getElementById("synk-hub-manage");
    const list = document.getElementById("synk-hub-channel-admin-list");
    const bannerUrl = document.getElementById("synk-hub-banner-url");
    const settingsBtn = document.getElementById("synk-hub-server-settings-btn");
    const allowed = canManageSynkServer(group);
    if (settingsBtn) settingsBtn.hidden = !allowed;
    if (!panel) return;
    if (!allowed) {
      if (!panel.hidden) setServerSettingsOpen(false);
      return;
    }
    const titleEl = document.getElementById("synk-server-settings-title");
    if (titleEl) titleEl.textContent = (group && group.name) || "Server";
    const nameEl = document.getElementById("synk-hub-server-name");
    const descEl = document.getElementById("synk-hub-server-desc");
    if (nameEl && document.activeElement !== nameEl) nameEl.value = String((group && group.name) || "");
    if (descEl && document.activeElement !== descEl) descEl.value = String((group && group.description) || "");
    if (bannerUrl && document.activeElement !== bannerUrl) {
      bannerUrl.value = String((group && (group.bannerUrl || group.coverUrl || "")) || "");
    }
    paintServerIcon(document.getElementById("synk-hub-icon-preview"), group);
    const channels = Array.isArray(group && group.channels) ? group.channels.slice() : [];
    channels.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    if (list) {
      list.innerHTML = channels.length
        ? channels
            .map((ch) => {
              const kind = String(ch.kind || "text");
              return `<div class="synk-hub-channel-admin-row" data-channel-id="${escapeHtml(ch.id || "")}">
                <div class="synk-hub-channel-admin-copy">
                  <strong># ${escapeHtml(ch.name || ch.slug || "channel")}</strong>
                  <span class="muted">${escapeHtml(kind)}${ch.description ? ` · ${escapeHtml(ch.description)}` : ""}</span>
                </div>
                <div class="synk-hub-channel-admin-actions">
                  <button type="button" class="btn btn-secondary btn-compact" data-synk-edit-channel="${escapeHtml(ch.id || "")}">Edit</button>
                  <button type="button" class="btn btn-secondary btn-compact" data-synk-delete-channel="${escapeHtml(ch.id || "")}">Delete</button>
                </div>
              </div>`;
            })
            .join("")
        : `<p class="muted" style="margin:0;font-size:0.82rem;">No channels yet.</p>`;
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
        composerOpen.textContent = "What’s on your mind?";
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
      activePost = post || null;
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
      const acting = String(actingUsername() || publicUsername || "").trim().toLowerCase();
      const isSelf = !!(acting && acting === String(uname || "").trim().toLowerCase());
      const friendship = (profile.friendship && profile.friendship.status) || "none";
      const canMessage = !!profile.canMessage;
      const profileBio = String(profile.bio || "").trim();
      const followerCount = Number(profile.followerCount || 0);
      const followingCount = Number(profile.followingCount || 0);
      const isFollowing = !!profile.isFollowing;
      setBannerMode("user", true);
      paintAvatar(viewIcon, profile.avatarUrl || "", dname);
      setText("view-title", dname);
      const viewSub = document.getElementById("view-sub");
      if (viewSub) {
        const postsLabel = `${Number(profile.postCount || 0)} post${Number(profile.postCount || 0) === 1 ? "" : "s"}`;
        const joinedLabel = profile.joinedAt ? ` · Joined ${escapeHtml(formatJoinedMonthYear(profile.joinedAt))}` : "";
        viewSub.innerHTML = `${escapeHtml(postsLabel)}${joinedLabel}
          <span class="reddit-meta-dot">·</span>
          <button class="reddit-follow-stat" type="button" data-follow-list="followers" data-username="${escapeHtml(uname)}"><strong>${followerCount.toLocaleString()}</strong> Followers</button>
          <span class="reddit-meta-dot">·</span>
          <button class="reddit-follow-stat" type="button" data-follow-list="following" data-username="${escapeHtml(uname)}"><strong>${followingCount.toLocaleString()}</strong> Following</button>`;
      }
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
      const actionsHost = document.querySelector("#view-banner .reddit-community-actions") || document.getElementById("view-actions");
      let actions = "";
      if (!isSelf && publicUsername) {
        const followLabel = isFollowing ? "Unfollow" : "Follow";
        const followIcon = isFollowing ? ico("userCheck", 18) : ico("userPlus", 18);
        actions += `<button class="reddit-icon-action ${isFollowing ? "is-active" : ""}" type="button" data-profile-action="${isFollowing ? "unfollow" : "follow"}" data-username="${escapeHtml(uname)}" title="${followLabel}" aria-label="${followLabel}">${followIcon}</button>`;
        if (friendship === "friends") {
          actions += `<button class="reddit-icon-action is-active" type="button" data-profile-action="unfriend" data-username="${escapeHtml(uname)}" title="Friends" aria-label="Friends">${ico("userCheck", 18)}</button>`;
        } else if (friendship === "pending_out") {
          actions += `<button class="reddit-icon-action is-pending" type="button" data-profile-action="cancel-friend" data-username="${escapeHtml(uname)}" title="Request sent" aria-label="Request sent">${ico("userMinus", 18)}</button>`;
        } else if (friendship === "pending_in") {
          actions += `<button class="reddit-icon-action is-accent" type="button" data-profile-action="accept-friend" data-username="${escapeHtml(uname)}" title="Accept friend request" aria-label="Accept friend request">${ico("userPlus", 18)}</button>`;
          actions += `<button class="reddit-icon-action" type="button" data-profile-action="decline-friend" data-username="${escapeHtml(uname)}" title="Decline" aria-label="Decline friend request">${ico("userMinus", 18)}</button>`;
        } else {
          actions += `<button class="reddit-icon-action" type="button" data-profile-action="add-friend" data-username="${escapeHtml(uname)}" title="Add friend" aria-label="Add friend">${ico("users", 18)}</button>`;
        }
        // Chat icon — never Join on profiles.
        if (canMessage || friendship === "friends") {
          actions += `<button class="reddit-icon-action is-accent" type="button" data-profile-action="message" data-username="${escapeHtml(uname)}" ${canMessage ? "" : "disabled"} title="Chat" aria-label="Chat">${ico("chat", 18)}</button>`;
        } else {
          actions += `<button class="reddit-icon-action" type="button" data-profile-action="message" data-username="${escapeHtml(uname)}" disabled title="Messaging not available" aria-label="Chat unavailable">${ico("chat", 18)}</button>`;
        }
      } else if (isSelf) {
        actions += `<a class="btn btn-secondary btn-compact" href="/community/settings">Edit profile</a>`;
      }
      if (actionsHost) {
        actionsHost.innerHTML = actions;
      }
      if (profileMeta) {
        const assigned = profile.tags || [];
        const tagsHtml = assigned.length
          ? assigned
              .map((tag) =>
                tagChip(tag, {
                  canPin: canPinTagsFor(profile.username),
                })
              )
              .join("")
          : "";
        const manager = tagManagerHtml({
          targetType: "user",
          targetKey: uname,
          assigned,
        });
        const body = `${tagsHtml ? `<div class="community-tag-list synk-tag-badge-row">${tagsHtml}</div>` : ""}${manager}`;
        profileMeta.hidden = !body;
        profileMeta.innerHTML = body
          ? `<div class="community-profile-card community-profile-card-clean">${body}</div>`
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
      // Reddit-style community card is for other groups only.
      // Official Synk uses the Discord-style server banner inside the hub rail.
      setBannerMode("group", !isDiscordTheme(group), group);
      syncGroupBannerForm(group);
      if (viewIcon) viewIcon.textContent = (slug || "?").slice(0, 1).toUpperCase();
      const official =
        group && (group.isOfficial || group.slug === "synk")
          ? ' <span class="official-pill">Official</span>'
          : "";
      const titleEl = document.getElementById("view-title");
      if (titleEl) titleEl.innerHTML = `${escapeHtml(name)}${official}`;
      else setText("view-title", name);
      const subBits = [];
      if (memberCount != null) subBits.push(`${memberCount.toLocaleString()} member${memberCount === 1 ? "" : "s"}`);
      else if (postCount != null) subBits.push(`${postCount.toLocaleString()} post${postCount === 1 ? "" : "s"}`);
      setText("view-sub", subBits.filter(Boolean).join(" · ") || "Group");
      if (viewBlurb) {
        const desc = (group && group.description) || "";
        viewBlurb.textContent = desc;
        viewBlurb.hidden = !desc;
      }
      if (profileMeta) {
        const assigned = (group && group.tags) || [];
        const tagsHtml = assigned.map((tag) => tagChip(tag, { compact: true })).join("");
        const manager = tagManagerHtml({
          targetType: "group",
          targetKey: slug,
          assigned,
        });
        const body = `${tagsHtml ? `<div class="community-tag-list synk-tag-badge-row">${tagsHtml}</div>` : ""}${manager}`;
        profileMeta.hidden = !body;
        profileMeta.innerHTML = body
          ? `<div class="community-profile-card community-profile-card-clean">${body}</div>`
          : "";
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
      setText("page-head-sub", "Find people, groups, and posts");
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
      setText("page-head-sub", "What’s getting attention right now");
      updateAboutRail(data);
      return;
    }
    if (route.type === "groups") {
      setBannerMode("home", false);
      if (viewBlurb) {
        viewBlurb.hidden = true;
        viewBlurb.textContent = "";
      }
      if (pageHead) pageHead.hidden = false;
      setText("page-head-title", "Your groups");
      setText("page-head-sub", "Communities you’ve joined and more to explore");
      if (composerCard) composerCard.hidden = true;
      const discordShell = document.getElementById("discord-shell");
      if (discordShell) discordShell.hidden = true;
      document.body.classList.remove("is-discord-group");
      mountFeedStack(false);
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
    setText("page-head-title", "Home");
    setText("page-head-sub", "Updates from groups you follow");
    updateAboutRail(data);
  }

  async function loadCommunity({ soft = false } = {}) {
    const seq = ++communityLoadSeq;
    if (communityLoadAbort) {
      try {
        communityLoadAbort.abort();
      } catch (_) {}
    }
    const abort = typeof AbortController !== "undefined" ? new AbortController() : null;
    communityLoadAbort = abort;
    try {
      const __touchStay = () => {
        try {
          if (window.SynkSession) window.SynkSession.touchSession();
        } catch (_) {}
      };
      cancelContentLoader();
      const showFeedSkeleton =
        !soft &&
        ["home", "popular", "group", "user", "search"].includes(route.type);
      if (showFeedSkeleton) scheduleFeedLoader();
      if (!soft && route.type === "post") schedulePostLoader();

      let url = "/api/synk-community";
      const sort = apiSort();
      const shellOnly =
        route.type === "settings" ||
        route.type === "submit" ||
        route.type === "mod" ||
        route.type === "groups";
      if (route.type === "post" && route.postId) {
        url += `?post=${encodeURIComponent(route.postId)}`;
      } else if (route.type === "inbox") {
        url += "?inbox=1";
      } else if (shellOnly) {
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
        const viewer = actingUsername() || publicUsername || "";
        if (viewer) url += `&asUsername=${encodeURIComponent(viewer)}`;
      } else if (route.type === "search") {
        const q = route.query || "";
        const tab = route.tab || "all";
        const searchSort = tab === "popular" ? "hot" : sort;
        url += `?q=${encodeURIComponent(q)}&tab=${encodeURIComponent(tab)}&sort=${encodeURIComponent(searchSort)}`;
      } else if (sort && sort !== "new") {
        url += `?sort=${encodeURIComponent(sort)}`;
      }

      const res = await fetch(url, {
        headers: hubHeaders(),
        signal: abort ? abort.signal : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (seq !== communityLoadSeq) return;
      if (!res.ok) throw new Error(data.error || "Unable to load Community. Please try again.");
      me = data.me || null;
      __touchStay();
      publicUsername = (me && me.publicUsername) || "";
      displayName = (me && me.displayName) || "";
      photoUrl = (me && me.photoUrl) || "";
      avatarUrl = (me && me.avatarUrl) || "";
      bio = (me && me.bio) || "";
      dmPolicy = (me && me.dmPolicy) || "friends";
      presenceStatus = normalizePresenceStatus((me && me.presenceStatus) || "online");
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
        applyViewState(data);
        renderGroupsPage();
        writeRouteCache(route, data);
        return;
      }
      if (route.type === "inbox") {
        setInboxTab(inboxTab);
        if (inboxTab === "messages") {
          loadDmThreads().catch(() => {});
        }
        // Avoid a second home fetch when we already know the group list.
        if ((!Array.isArray(data.groups) || !data.groups.length) && !(groups && groups.length)) {
          try {
            const baseRes = await fetch("/api/synk-community?feed=home&shell=1", {
              headers: hubHeaders(),
              signal: abort ? abort.signal : undefined,
            });
            if (seq !== communityLoadSeq) return;
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
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
        applyUsernameState();
        renderGroups();
        applyViewState(data);
        lastNotifications = data.notifications || [];
        renderInbox(lastNotifications);
        renderNotifPanel(lastNotifications);
        notifLoaded = true;
        writeRouteCache(route, data);
        return;
      }

      if (route.type === "post") {
        const post = data.post || (data.posts && data.posts[0]) || null;
        lastPosts = post ? [post] : [];
        lastComments = data.comments || [];
        applyViewState(data);
        renderPostDetail(post);
        renderComments(lastComments);
        writeRouteCache(route, data);
        return;
      }

      applyViewState(data);
      if (route.type === "settings" || route.type === "submit" || route.type === "mod") {
        writeRouteCache(route, data);
        return;
      }
      if (route.type === "search") {
        renderSearchResults(data);
        writeRouteCache(route, data);
        return;
      }
      syncSearchTabs();
      lastPosts = data.posts || [];
      renderFeed(lastPosts);
      writeRouteCache(route, data);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      throw err;
    } finally {
      if (seq === communityLoadSeq) {
        cancelContentLoader();
        hideSynkBootLoader();
      }
    }
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

  if (groupList) {
    groupList.addEventListener("click", (e) => {
      const link = e.target.closest("[data-group]");
      if (!link) return;
      e.preventDefault();
      navigate({ type: "group", slug: link.getAttribute("data-group") || "", username: "" }).catch((err) => {
        document.getElementById("post-status").textContent = err.message || "Could not open group";
      });
    });
  }

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate({ type: "home", slug: "", username: "" }).catch(() => {});
  });

  feedEl.addEventListener("click", (e) => {
    const filterBtn = e.target.closest("[data-groups-filter]");
    if (filterBtn && route.type === "groups") {
      e.preventDefault();
      groupsPageFilter = filterBtn.getAttribute("data-groups-filter") || "joined";
      renderGroupsPage();
      return;
    }
    const joinBtn = e.target.closest("[data-join-group]");
    if (joinBtn) {
      e.preventDefault();
      e.stopPropagation();
      const slug = joinBtn.getAttribute("data-join-group") || "";
      toggleGroupMembership(slug, joinBtn).catch(() => {});
      return;
    }
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

  feedEl.addEventListener("input", (e) => {
    const input = e.target.closest("#groups-page-search");
    if (!input || route.type !== "groups") return;
    groupsPageQuery = input.value || "";
    renderGroupsPage();
    const again = document.getElementById("groups-page-search");
    if (again) {
      again.focus();
      try {
        const len = again.value.length;
        again.setSelectionRange(len, len);
      } catch (_) {}
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
    const cached = readRouteCache(route);
    paintRouteShell(route, cached);
    loadCommunity({ soft: !!cached || !!me }).catch(() => {});
  });

  async function saveUsername(username, statusEl) {
    statusEl.textContent = "Saving…";
    const current = actingUsername() || publicUsername || "";
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: hubHeaders(),
      body: JSON.stringify({
        action: "set-username",
        username,
        asUsername: current,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to save username. Please try again.");
    const nextName = String(data.username || username || "").trim().toLowerCase();
    const nextPrimary = String(data.publicUsername || publicUsername || "").trim().toLowerCase();
    if (nextPrimary) publicUsername = nextPrimary;
    // Keep the switched-in account selected after a rename (primary or alt).
    storePersona(nextName || nextPrimary || publicUsername);
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
      status.textContent = err.message || "Unable to save. Please try again.";
    }
  });


  async function uploadSettingsImage({ fileInput, statusEl, action, extra = {}, onSuccess, crop = null }) {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Image too large (max ~8MB)");
      if (statusEl) statusEl.textContent = "Crop & scale…";
      const dataUrl = crop
        ? await cropImageFile(file, crop)
        : await readFileAsDataUrl(file);
      if (!dataUrl) {
        if (statusEl) statusEl.textContent = "";
        return;
      }
      if (statusEl) statusEl.textContent = "Uploading…";
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
        crop: {
          shape: "circle",
          title: "Crop profile picture",
          hint: "Drag to reposition. Zoom to scale. The circle is what people will see.",
          outputSize: 512,
          mime: "image/jpeg",
          quality: 0.92,
        },
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
        if (!res.ok) throw new Error(data.error || "Unable to save display name. Please try again.");
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
        if (status) status.textContent = err.message || "Unable to save. Please try again.";
      }
    });
  }

  document.getElementById("username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("username-status");
    try {
      await saveUsername(document.getElementById("public-username").value, status);
    } catch (err) {
      status.textContent = err.message || "Unable to save. Please try again.";
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
      if (title.length > 300) throw new Error("Title must be 300 characters or fewer");

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
        if (!body) throw new Error("Enter text for your post");
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

  const postTitleInput = document.getElementById("post-title");
  const postTitleCount = document.getElementById("post-title-count");
  const syncPostTitleCount = () => {
    if (!postTitleCount || !postTitleInput) return;
    const n = String(postTitleInput.value || "").length;
    postTitleCount.textContent = String(n);
    postTitleCount.classList.toggle("is-warn", n >= 280);
    postTitleCount.classList.toggle("is-max", n >= 300);
  };
  if (postTitleInput) {
    postTitleInput.addEventListener("input", syncPostTitleCount);
    syncPostTitleCount();
  }

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
      const prev = (lastNotifications || []).slice();
      notifSeq += 1;
      const seq = notifSeq;
      inboxMarkRead.classList.add("is-busy");
      lastNotifications = [];
      renderInbox([]);
      renderNotifPanel([]);
      unreadCount = 0;
      updateInboxBadge();
      // Allow a future unread release note to alert once after this was seen.
      localAppUpdateNotified = false;
      prev.forEach((note) => {
        if (isAppUpdateKind(note && note.kind) && note.id) {
          seenNotifIds.delete(String(note.id));
        }
      });
      try {
        const data = await communityAction({ action: "mark-read" });
        if (seq !== notifSeq) return;
        const notes = Array.isArray(data.notifications) ? data.notifications : [];
        lastNotifications = notes.slice();
        renderInbox(notes);
        renderNotifPanel(notes);
        unreadCount = typeof data.unreadCount === "number" ? data.unreadCount : 0;
        updateInboxBadge();
      } catch (_) {
        if (seq === notifSeq) {
          lastNotifications = prev;
          renderInbox(prev);
          renderNotifPanel(prev);
          unreadCount = prev.filter((n) => !n.readAt).length;
          updateInboxBadge();
        }
      } finally {
        inboxMarkRead.classList.remove("is-busy");
      }
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
      if (!res.ok) throw new Error(data.error || "Could not create account");
      document.getElementById("alt-username").value = "";
      document.getElementById("alt-label").value = "";
      alts = data.alts || [];
      if (me) me.alts = alts;
      renderAlts();
      syncPersonaUi();
      status.textContent = `Created @${data.alt.username}`;
    } catch (err) {
      status.textContent = err.message || "Could not create account";
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
      if (!res.ok) throw new Error(data.error || "Could not delete account");
      alts = data.alts || [];
      if (me) me.alts = alts;
      if (activePersona === username) storePersona(publicUsername);
      renderAlts();
      syncPersonaUi();
      status.textContent = "Account deleted";
    } catch (err) {
      status.textContent = err.message || "Could not delete account";
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
        if (file.size > 8 * 1024 * 1024) throw new Error("Icon too large (max ~8MB)");
        if (status) status.textContent = "Crop & scale…";
        pendingTagIconData = await cropImageFile(file, {
          shape: "square",
          title: "Crop tag icon",
          hint: "Drag to reposition. Zoom to scale. Icons look best when they fill the square.",
          outputSize: 256,
          mime: "image/png",
        });
        if (!pendingTagIconData) {
          tagIconInput.value = "";
          if (status) status.textContent = "";
          return;
        }
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
        if (file.size > 8 * 1024 * 1024) throw new Error("Icon too large (max ~8MB)");
        if (status) status.textContent = "Crop & scale…";
        const iconData = await cropImageFile(file, {
          shape: "square",
          title: "Crop tag icon",
          hint: "Drag to reposition. Zoom to scale. Icons look best when they fill the square.",
          outputSize: 256,
          mime: "image/png",
        });
        if (!iconData) {
          if (status) status.textContent = "";
          return;
        }
        if (status) status.textContent = "Uploading icon…";
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
      if (!res.ok) throw new Error(data.error || "Unable to update pinned tag. Please try again.");
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
      if (status) status.textContent = err.message || "Unable to update pinned tag. Please try again.";
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
      const who = actingUsername() || publicUsername;
      if (!who) return;
      e.preventDefault();
      navigate({ type: "user", slug: "", username: who }).catch(() => {});
    });
  }
  const menuSignout = document.getElementById("menu-signout-btn");
  if (menuSignout) {
    menuSignout.addEventListener("click", () => {
      const legacy = document.getElementById("signout-btn");
      if (legacy) legacy.click();
      else {
        if (window.SynkSession) window.SynkSession.clearSession();
    else {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
        location.href = "/verify?reauth=1";
      }
    });
  }

  bindNav(document.getElementById("tab-me"), () => ({
    type: "user",
    slug: "",
    username: actingUsername() || publicUsername || "",
  }));

  

  const serverSettingsBtn = document.getElementById("synk-hub-server-settings-btn");
  if (serverSettingsBtn) {
    serverSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!canManageSynkServer(activeGroupDetail)) return;
      setServerSettingsOpen(true, "overview");
    });
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-server-settings-close]")) {
      e.preventDefault();
      setServerSettingsOpen(false);
      return;
    }
    const tabBtn = e.target.closest("[data-server-settings-tab]");
    if (tabBtn) {
      e.preventDefault();
      setServerSettingsTab(tabBtn.getAttribute("data-server-settings-tab"));
      return;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("server-settings-open")) {
      setServerSettingsOpen(false);
    }
  });

  const serverIconFile = document.getElementById("synk-hub-icon-file");
  if (serverIconFile) {
    serverIconFile.addEventListener("change", async () => {
      const file = serverIconFile.files && serverIconFile.files[0];
      const status = document.getElementById("synk-hub-overview-status");
      if (!file) return;
      try {
        if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file");
        const dataUrl = await cropImageFile(file, {
          shape: "square",
          title: "Crop server icon",
          hint: "Drag to reposition. Zoom to scale. Icons look best when they fill the square.",
          outputWidth: 512,
          outputHeight: 512,
          maxWidth: 512,
          maxHeight: 512,
          mime: "image/jpeg",
          quality: 0.92,
        });
        if (!dataUrl) {
          serverIconFile.value = "";
          return;
        }
        pendingServerIconData = dataUrl;
        clearServerIcon = false;
        const preview = document.getElementById("synk-hub-icon-preview");
        if (preview) {
          preview.classList.add("has-image");
          preview.innerHTML = `<img src="${dataUrl}" alt="" />`;
        }
        if (status) status.textContent = "Icon ready — click Save changes.";
      } catch (err) {
        if (status) status.textContent = err.message || "Could not crop icon";
        serverIconFile.value = "";
      }
    });
  }
  const serverIconClear = document.getElementById("synk-hub-icon-clear");
  if (serverIconClear) {
    serverIconClear.addEventListener("click", () => {
      pendingServerIconData = "";
      clearServerIcon = true;
      const preview = document.getElementById("synk-hub-icon-preview");
      paintServerIcon(preview, { name: (document.getElementById("synk-hub-server-name") || {}).value || "S" });
      const file = document.getElementById("synk-hub-icon-file");
      if (file) file.value = "";
      const status = document.getElementById("synk-hub-overview-status");
      if (status) status.textContent = "Icon will be removed when you save.";
    });
  }

  const overviewForm = document.getElementById("synk-hub-overview-form");
  if (overviewForm) {
    overviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("synk-hub-overview-status");
      const nameEl = document.getElementById("synk-hub-server-name");
      const descEl = document.getElementById("synk-hub-server-desc");
      const fileInput = document.getElementById("synk-hub-banner-file");
      const urlInput = document.getElementById("synk-hub-banner-url");
      if (status) status.textContent = "Saving…";
      try {
        if (!canManageSynkServer(activeGroupDetail)) throw new Error("Staff only");
        const payload = {
          action: "update-group",
          group: "synk",
          groupId: activeGroupDetail && activeGroupDetail.id,
          name: nameEl ? nameEl.value : "",
          description: descEl ? descEl.value : "",
        };
        if (clearServerIcon) payload.clearIcon = true;
        else if (pendingServerIconData) payload.iconData = pendingServerIconData;

        const file = fileInput && fileInput.files && fileInput.files[0];
        if (file) {
          if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file for the banner");
          payload.imageData = await cropImageFile(file, BANNER_CROP);
          if (!payload.imageData) {
            if (status) status.textContent = "";
            return;
          }
        } else if (urlInput && String(urlInput.value || "").trim()) {
          payload.bannerUrl = String(urlInput.value || "").trim();
        }

        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...hubHeaders() },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save server settings");
        pendingServerIconData = "";
        clearServerIcon = false;
        if (fileInput) fileInput.value = "";
        const iconFile = document.getElementById("synk-hub-icon-file");
        if (iconFile) iconFile.value = "";
        activeGroupDetail = data.group || activeGroupDetail;
        const idx = groups.findIndex((g) => g.slug === (activeGroupDetail && activeGroupDetail.slug));
        if (idx >= 0) groups[idx] = { ...groups[idx], ...activeGroupDetail };
        renderDiscordChannels(activeGroupDetail);
        renderSynkServerManage(activeGroupDetail);
        if (status) status.textContent = "Saved.";
      } catch (err) {
        if (status) status.textContent = err.message || "Could not save";
      }
    });
  }


  const synkBannerForm = document.getElementById("synk-hub-banner-form");
  if (synkBannerForm) {
    synkBannerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("synk-hub-banner-status");
      const fileInput = document.getElementById("synk-hub-banner-file");
      const urlInput = document.getElementById("synk-hub-banner-url");
      if (status) status.textContent = "Saving banner…";
      try {
        if (!canManageSynkServer(activeGroupDetail)) throw new Error("Staff only");
        const payload = {
          action: "update-group",
          group: "synk",
          groupId: activeGroupDetail && activeGroupDetail.id,
        };
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (file) {
          if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file");
          payload.imageData = await cropImageFile(file, BANNER_CROP);
          if (!payload.imageData) {
            if (status) status.textContent = "";
            return;
          }
        } else {
          payload.bannerUrl = String((urlInput && urlInput.value) || "").trim();
        }
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...hubHeaders() },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save banner");
        if (fileInput) fileInput.value = "";
        if (status) status.textContent = "Banner saved.";
        activeGroupDetail = data.group || activeGroupDetail;
        renderDiscordChannels(activeGroupDetail);
      } catch (err) {
        if (status) status.textContent = err.message || "Could not save banner";
      }
    });
  }
  const synkBannerClear = document.getElementById("synk-hub-banner-clear");
  if (synkBannerClear) {
    synkBannerClear.addEventListener("click", async () => {
      const status =
        document.getElementById("synk-hub-overview-status") ||
        document.getElementById("synk-hub-banner-status");
      if (status) status.textContent = "Clearing banner…";
      try {
        if (!canManageSynkServer(activeGroupDetail)) throw new Error("Staff only");
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...hubHeaders() },
          body: JSON.stringify({
            action: "update-group",
            group: "synk",
            groupId: activeGroupDetail && activeGroupDetail.id,
            clearBanner: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not clear banner");
        const urlInput = document.getElementById("synk-hub-banner-url");
        if (urlInput) urlInput.value = "";
        const fileInput = document.getElementById("synk-hub-banner-file");
        if (fileInput) fileInput.value = "";
        if (status) status.textContent = "Banner cleared.";
        activeGroupDetail = data.group || activeGroupDetail;
        renderDiscordChannels(activeGroupDetail);
        renderSynkServerManage(activeGroupDetail);
      } catch (err) {
        if (status) status.textContent = err.message || "Could not clear banner";
      }
    });
  }

  async function saveGroupBanner({ clear = false } = {}) {
    const status = document.getElementById("group-banner-status");
    const fileInput = document.getElementById("group-banner-file");
    const urlInput = document.getElementById("group-banner-url");
    const group = activeGroupDetail;
    if (!group || isDiscordTheme(group)) throw new Error("Open a group to edit its banner");
    if (!canManageGroup(group)) throw new Error("Only the group owner can edit this banner");
    if (status) {
      status.dataset.keep = "1";
      status.textContent = clear ? "Clearing…" : "Saving banner…";
    }
    const payload = {
      action: "update-group",
      group: group.slug,
      groupId: group.id,
    };
    if (clear) {
      payload.clearBanner = true;
    } else {
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (file) {
        if (!String(file.type || "").startsWith("image/")) throw new Error("Choose an image file");
        payload.imageData = await cropImageFile(file, BANNER_CROP);
        if (!payload.imageData) {
          if (status) {
            status.textContent = "";
            delete status.dataset.keep;
          }
          return;
        }
      } else {
        payload.bannerUrl = String((urlInput && urlInput.value) || "").trim();
      }
    }
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hubHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not save banner");
    if (fileInput) fileInput.value = "";
    activeGroupDetail = data.group || activeGroupDetail;
    const idx = groups.findIndex((g) => g.slug === (activeGroupDetail && activeGroupDetail.slug));
    if (idx >= 0) groups[idx] = { ...groups[idx], ...activeGroupDetail };
    setBannerMode("group", true, activeGroupDetail);
    syncGroupBannerForm(activeGroupDetail);
    if (status) {
      status.textContent = clear ? "Banner cleared." : "Banner saved.";
      delete status.dataset.keep;
    }
  }

  const groupBannerForm = document.getElementById("group-banner-form");
  if (groupBannerForm) {
    groupBannerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("group-banner-status");
      try {
        await saveGroupBanner({ clear: false });
      } catch (err) {
        if (status) {
          status.textContent = err.message || "Could not save banner";
          delete status.dataset.keep;
        }
      }
    });
  }
  const groupBannerClear = document.getElementById("group-banner-clear");
  if (groupBannerClear) {
    groupBannerClear.addEventListener("click", async () => {
      const status = document.getElementById("group-banner-status");
      try {
        await saveGroupBanner({ clear: true });
        const urlInput = document.getElementById("group-banner-url");
        if (urlInput) urlInput.value = "";
      } catch (err) {
        if (status) {
          status.textContent = err.message || "Could not clear banner";
          delete status.dataset.keep;
        }
      }
    });
  }

  const synkChannelForm = document.getElementById("synk-hub-channel-form");
  if (synkChannelForm) {
    synkChannelForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("synk-hub-channel-status");
      if (status) status.textContent = "Saving…";
      try {
        if (!canManageSynkServer(activeGroupDetail)) throw new Error("Staff only");
        const id = String((document.getElementById("synk-hub-channel-id") || {}).value || "").trim();
        const payload = {
          action: id ? "update-channel" : "create-channel",
          group: "synk",
          groupId: activeGroupDetail && activeGroupDetail.id,
          channelId: id || undefined,
          name: document.getElementById("synk-hub-channel-name").value,
          slug: document.getElementById("synk-hub-channel-slug").value,
          kind: document.getElementById("synk-hub-channel-kind").value,
          categoryName: document.getElementById("synk-hub-channel-category").value,
          description: document.getElementById("synk-hub-channel-desc").value,
        };
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...hubHeaders() },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save channel");
        if (status) status.textContent = id ? "Channel updated." : "Channel added.";
        resetSynkChannelForm();
        if (activeGroupDetail) {
          activeGroupDetail.channels = data.channels || activeGroupDetail.channels;
          activeGroupDetail.categories = data.categories || activeGroupDetail.categories;
        }
        renderDiscordChannels(activeGroupDetail);
      } catch (err) {
        if (status) status.textContent = err.message || "Could not save channel";
      }
    });
  }
  const synkChannelReset = document.getElementById("synk-hub-channel-reset");
  if (synkChannelReset) {
    synkChannelReset.addEventListener("click", () => {
      resetSynkChannelForm();
      const status = document.getElementById("synk-hub-channel-status");
      if (status) status.textContent = "";
    });
  }
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-synk-edit-channel]");
    if (editBtn) {
      const id = editBtn.getAttribute("data-synk-edit-channel");
      const channels = Array.isArray(activeGroupDetail && activeGroupDetail.channels)
        ? activeGroupDetail.channels
        : [];
      const channel = channels.find((c) => String(c.id) === String(id));
      fillSynkChannelForm(channel);
      setServerSettingsOpen(true, "channels");
      return;
    }
    const delBtn = e.target.closest("[data-synk-delete-channel]");
    if (delBtn) {
      const id = delBtn.getAttribute("data-synk-delete-channel");
      if (!id || !canManageSynkServer(activeGroupDetail)) return;
      if (!window.confirm("Delete this channel? Posts move to Lounge when possible.")) return;
      const status = document.getElementById("synk-hub-channel-status");
      if (status) status.textContent = "Deleting…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...hubHeaders() },
          body: JSON.stringify({
            action: "delete-channel",
            group: "synk",
            groupId: activeGroupDetail && activeGroupDetail.id,
            channelId: id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not delete channel");
        if (status) status.textContent = "Channel deleted.";
        if (activeGroupDetail) {
          activeGroupDetail.channels = data.channels || [];
          activeGroupDetail.categories = data.categories || activeGroupDetail.categories;
        }
        resetSynkChannelForm();
        renderDiscordChannels(activeGroupDetail);
      } catch (err) {
        if (status) status.textContent = err.message || "Could not delete channel";
      }
    }
  });

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
          username: actingUsername() || publicUsername,
        });
        const savedFor = String(data.username || actingUsername() || publicUsername)
          .trim()
          .toLowerCase();
        const savedBio = data.bio || "";
        if (savedFor === publicUsername) {
          bio = savedBio;
          if (me) me.bio = savedBio;
        } else {
          alts = (alts || []).map((alt) =>
            alt.username === savedFor ? { ...alt, bio: savedBio } : alt
          );
          if (me) me.alts = alts;
        }
        if (status) status.textContent = "Saved";
        applyUsernameState();
      } catch (err) {
        if (status) status.textContent = err.message || "Unable to save bio. Please try again.";
      }
    });
  }

  const dmForm = document.getElementById("settings-dm-form");
  const menuPresenceBtn = document.getElementById("menu-presence-btn");
  const menuPresenceMenu = document.getElementById("menu-presence-menu");
  const menuPresenceWrap = document.getElementById("menu-presence");

  function syncThemePreferenceButtons() {
    const row = document.getElementById("settings-theme-row");
    const status = document.getElementById("settings-theme-status");
    if (!row || !window.SynkTheme) return;
    const pref = window.SynkTheme.getPreference();
    row.querySelectorAll("[data-theme-pref]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute("data-theme-pref") === pref);
    });
    if (status) {
      const label = pref === "auto" ? "Automatic" : pref === "dark" ? "Dark" : "Light";
      status.textContent = `Using ${label}${pref === "auto" ? ` (${window.SynkTheme.getTheme()})` : ""}`;
    }
  }

  const themeRow = document.getElementById("settings-theme-row");
  if (themeRow) {
    themeRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-pref]");
      if (!btn || !window.SynkTheme) return;
      window.SynkTheme.setPreference(btn.getAttribute("data-theme-pref"));
      syncThemePreferenceButtons();
    });
    syncThemePreferenceButtons();
    window.addEventListener("synk-theme-change", syncThemePreferenceButtons);
  }

  if (menuPresenceBtn) {
    menuPresenceBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenuPresenceMenu();
    });
  }
  if (menuPresenceMenu) {
    menuPresenceMenu.addEventListener("click", async (e) => {
      const item = e.target.closest("[data-presence]");
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      const next = item.getAttribute("data-presence");
      closeMenuPresenceMenu();
      try {
        await savePresenceStatus(next);
        applyUsernameState();
      } catch (err) {
        showToast(err.message || "Could not update status");
      }
    });
  }
  document.addEventListener("click", (e) => {
    if (!menuPresenceWrap || menuPresenceWrap.contains(e.target)) return;
    closeMenuPresenceMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenuPresenceMenu();
  });

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
          username: actingUsername() || publicUsername,
        });
        const savedFor = String(data.username || actingUsername() || publicUsername)
          .trim()
          .toLowerCase();
        const savedPolicy = data.dmPolicy || "friends";
        if (savedFor === publicUsername) {
          dmPolicy = savedPolicy;
          if (me) me.dmPolicy = savedPolicy;
        } else {
          alts = (alts || []).map((alt) =>
            alt.username === savedFor ? { ...alt, dmPolicy: savedPolicy } : alt
          );
          if (me) me.alts = alts;
        }
        if (status) status.textContent = "Saved";
        applyUsernameState();
      } catch (err) {
        if (status) status.textContent = err.message || "Unable to save. Please try again.";
      }
    });
  }

  function syncPushSettingsUi() {
    const status = document.getElementById("settings-push-status");
    const onBtn = document.getElementById("settings-push-btn");
    const offBtn = document.getElementById("settings-push-off-btn");
    const push = window.SynkPush;
    if (!push || !push.supportsPush()) {
      if (status) status.textContent = "Browser notifications are not supported on this device.";
      if (onBtn) onBtn.hidden = true;
      if (offBtn) offBtn.hidden = true;
      return;
    }
    const pref = push.getPref();
    const granted = Notification.permission === "granted";
    const enabled = pref === "on" && granted;
    if (onBtn) {
      onBtn.hidden = enabled;
      onBtn.textContent = granted ? "Enable notifications" : "Enable notifications";
    }
    if (offBtn) offBtn.hidden = !enabled;
    if (status) {
      if (Notification.permission === "denied") {
        status.textContent = "Notifications are blocked in your browser settings. Allow notifications for this site, then try again.";
      } else if (enabled) {
        status.textContent = "Notifications are enabled for messages and inbox updates.";
      } else if (pref === "off") {
        status.textContent = "Notifications are disabled on this device.";
      } else {
        status.textContent = "Optional. Enable to receive device notifications when Synk is closed.";
      }
    }
  }

  const pushOnBtn = document.getElementById("settings-push-btn");
  if (pushOnBtn) {
    pushOnBtn.addEventListener("click", async () => {
      const status = document.getElementById("settings-push-status");
      const push = window.SynkPush;
      if (!push) return;
      if (status) status.textContent = "Enabling notifications…";
      pushOnBtn.disabled = true;
      try {
        push.setPref("");
        const result = await push.ensureSubscription(hubHeaders(), { requestPermission: true });
        if (!result.ok) throw new Error(result.reason === "denied" ? "Notification permission denied" : "Unable to enable notifications");
        if (status) status.textContent = "Notifications enabled";
        syncPushSettingsUi();
      } catch (err) {
        if (status) status.textContent = err.message || "Unable to enable notifications";
      } finally {
        pushOnBtn.disabled = false;
        syncPushSettingsUi();
      }
    });
  }
  const pushOffBtn = document.getElementById("settings-push-off-btn");
  if (pushOffBtn) {
    pushOffBtn.addEventListener("click", async () => {
      const status = document.getElementById("settings-push-status");
      const push = window.SynkPush;
      if (!push) return;
      if (status) status.textContent = "Disabling notifications…";
      try {
        await push.disablePush(hubHeaders());
        if (status) status.textContent = "Notifications disabled on this device";
      } catch (err) {
        if (status) status.textContent = err.message || "Unable to disable notifications";
      }
      syncPushSettingsUi();
    });
  }
  syncPushSettingsUi();

  async function openNotifications() {
    inboxTab = "notifications";
    navigate({ type: "inbox", slug: "", username: "" }).catch(() => {});
    setInboxTab("notifications");
  }

  let dmFriendsCache = [];
  let dmNewOpen = false;

  function setDmChatOpen(open) {
    const shell = document.getElementById("dm-shell");
    if (shell) shell.classList.toggle("is-chat-open", !!open);
    document.body.classList.toggle("is-dm-chat-open", !!open);
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
    navigate({ type: "inbox", slug: "", username: "" }).catch(() => {});
    setInboxTab("messages");
    setDmChatOpen(!!activeDmUser);
    loadDmThreads()
      .then(() => (activeDmUser ? openDmThread(activeDmUser) : null))
      .catch(() => {});
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
        const presence = normalizePresenceStatus(t.otherPresence || "offline");
        const avatar = avatarMarkup(t.otherAvatarUrl || "", t.otherDisplayName || other, "community-face community-dm-avatar");
        return `<button type="button" class="community-dm-thread ${active}" data-dm-user="${escapeHtml(other)}" role="listitem">
          <span class="community-dm-avatar-wrap">
            ${avatar}
            ${presenceDotMarkup(presence)}
          </span>
          <span class="community-dm-thread-copy">
            <span class="community-dm-thread-top"><strong>${label}</strong><span>${when}</span></span>
            <span class="community-dm-thread-handle">${handle} · ${escapeHtml(presenceLabel(presence))}</span>
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
      input.placeholder = "Type a message…";
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
    const presenceEl = document.getElementById("dm-chat-presence");
    const form = document.getElementById("dm-compose-form");
    const hint = document.getElementById("dm-chat-hint");
    const meName = String(publicUsername || "")
      .trim()
      .toLowerCase();
    const thread = (dmThreads || []).find(
      (t) => String(t.otherUser || t.otherUsername || "").toLowerCase() === String(otherUser || "").toLowerCase()
    );
    const titleLabel = (thread && (thread.otherDisplayName || thread.otherUser)) || otherUser || "Select a conversation";
    const presence = normalizePresenceStatus((thread && thread.otherPresence) || "offline");
    if (title) title.textContent = titleLabel;
    if (sub) {
      sub.textContent = otherUser
        ? `@${otherUser} · ${presenceLabel(presence)}`
        : "";
    }
    if (profile) profile.href = otherUser ? `/user/${encodeURIComponent(otherUser)}` : "#";
    if (avatar) paintAvatar(avatar, (thread && thread.otherAvatarUrl) || "", titleLabel);
    paintPresenceDot(presenceEl, presence, { hidden: !otherUser });
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
              formatDmBubbleTime(m.createdAt)
            )}</time>`
          : "";
        return `<div class="community-dm-msg ${mine ? "is-mine" : "is-theirs"}" data-dm-message-id="${escapeHtml(
          String(m.id || "")
        )}">
          <div class="community-dm-bubble ${mine ? "is-mine" : "is-theirs"} ${edited ? "is-edited" : ""}" tabindex="0">
            <div class="community-dm-msg-body">${escapeHtml(m.body || "")}</div>
            <div class="community-dm-bubble-meta">${meta}${when}</div>
            ${historyHtml}
          </div>
          ${reactionsHtml}
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
    setDmChatOpen(true);

    // Paint immediately from cache / thread list so the chat feels instant.
    const cached = dmThreadCache.get(target);
    const existing =
      (dmThreads || []).find(
        (t) => String(t.otherUser || t.otherUsername || "").toLowerCase() === target
      ) || null;
    if (cached && cached.thread) {
      activeDmThreadId = cached.thread.id || activeDmThreadId || "";
      renderDmThreads(dmThreads);
      renderDmMessages(cached.messages || [], { otherUser: target });
    } else if (existing) {
      activeDmThreadId = existing.id || "";
      renderDmThreads(dmThreads);
      renderDmMessages([], { otherUser: target });
    } else {
      renderDmMessages([], { otherUser: target });
    }
    const form = document.getElementById("dm-compose-form");
    if (form) form.hidden = false;
    const input = document.getElementById("dm-compose-input");
    if (input) input.focus();

    const data = await communityAction({ action: "dm-open", username: target });
    if (String(activeDmUser || "").toLowerCase() !== target) return;
    activeDmThreadId = (data.thread && data.thread.id) || "";
    if (data.thread) {
      const idx = (dmThreads || []).findIndex(
        (t) => String(t.otherUser || t.otherUsername || "").toLowerCase() === target
      );
      if (idx >= 0) dmThreads[idx] = { ...dmThreads[idx], ...data.thread };
      else dmThreads = [data.thread, ...(dmThreads || [])];
    }
    dmThreadCache.set(target, {
      at: Date.now(),
      thread: data.thread || existing || null,
      messages: data.messages || [],
    });
    if (dmThreadCache.size > 20) {
      const oldest = dmThreadCache.keys().next().value;
      if (oldest) dmThreadCache.delete(oldest);
    }
    renderDmThreads(dmThreads);
    renderDmMessages(data.messages || [], { otherUser: target });
    if (form) form.hidden = false;
    if (input) input.focus();
  }

  document.querySelectorAll("[data-inbox-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setInboxTab(btn.getAttribute("data-inbox-tab"));
      if (inboxTab === "messages") {
        try {
          renderDmThreads(dmThreads || []);
        } catch (_) {}
        loadDmThreads()
          .then(() => (activeDmUser ? openDmThread(activeDmUser) : null))
          .catch((err) => showToast(err.message || "Could not load messages"));
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
        showToast(err.message || (editingDmMessageId ? "Unable to edit message." : "Message could not be sent. Please try again."));
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
      closeFollowListModal();
      if (dmNewOpen) setDmNewOpen(false);
    }
  });

  function closeFollowListModal() {
    const modal = document.getElementById("follow-list-modal");
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove("follow-list-lock");
  }

  async function openFollowListModal({ username, kind }) {
    const modal = document.getElementById("follow-list-modal");
    const title = document.getElementById("follow-list-title");
    const body = document.getElementById("follow-list-body");
    if (!modal || !body || !username) return;
    const label = kind === "following" ? "Following" : "Followers";
    if (title) title.textContent = label;
    body.innerHTML = plainLoadingHtml(`Loading ${label.toLowerCase()}`);
    modal.hidden = false;
    document.documentElement.classList.add("follow-list-lock");
    try {
      const data = await communityAction({
        action: kind === "following" ? "list-following" : "list-followers",
        username,
      });
      const users = Array.isArray(data.users) ? data.users : [];
      if (!users.length) {
        body.innerHTML = `<p class="muted reddit-follow-empty">No ${label.toLowerCase()} yet.</p>`;
        return;
      }
      body.innerHTML = users
        .map((user) => {
          const u = String(user.username || "").trim();
          const name = String(user.displayName || "").trim() || u;
          const initial = (name || "?").slice(0, 1).toUpperCase();
          const avatar = user.avatarUrl
            ? `<img src="${escapeHtml(user.avatarUrl)}" alt="" loading="lazy" />`
            : escapeHtml(initial);
          return `<a class="reddit-follow-row" href="/user/${encodeURIComponent(u)}" data-close-follow-list="1">
            <span class="reddit-follow-avatar" aria-hidden="true">${avatar}</span>
            <span class="reddit-follow-copy">
              <strong>${escapeHtml(name)}</strong>
              <span class="muted">${escapeHtml(u)}</span>
            </span>
          </a>`;
        })
        .join("");
    } catch (err) {
      body.innerHTML = `<p class="muted reddit-follow-empty">${escapeHtml(err.message || "Unable to load list")}</p>`;
    }
  }

  document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close-follow-list]");
    if (closer) {
      closeFollowListModal();
      return;
    }
    const btn = e.target.closest("[data-follow-list]");
    if (!btn) return;
    e.preventDefault();
    const kind = btn.getAttribute("data-follow-list") || "followers";
    const username = btn.getAttribute("data-username") || "";
    openFollowListModal({ username, kind }).catch(() => {});
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
      if (action === "follow" || action === "unfollow") {
        await communityAction({ action, username });
        showToast(action === "follow" ? "Following" : "Unfollowed");
      } else if (action === "add-friend") {
        await communityAction({ action: "friend-request", username });
        showToast("Request sent");
      } else if (action === "accept-friend") {
        await communityAction({ action: "friend-accept", username });
        showToast("Friend request accepted");
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
      showToast(err.message || "An unexpected error occurred. Please try again.");
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
      try {
        localStorage.setItem(SORT_KEY, sort);
      } catch (_) {}
      if (route.type === "popular" && sort === "new") {
        navigate({ type: "home", slug: "", username: "" }).catch(() => {});
        return;
      }
      syncSortTabs();
      if (route.type === "home" || route.type === "popular" || route.type === "group" || route.type === "user") {
        const cached = readRouteCache(route);
        if (cached && Array.isArray(cached.posts)) {
          lastPosts = cached.posts;
          try {
            renderFeed(lastPosts);
          } catch (_) {}
        }
        loadCommunity({ soft: true }).catch(() => {});
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
          if (window.SynkSession) window.SynkSession.clearSession();
    else {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
          sessionStorage.removeItem(ACT_AS_KEY);
        } catch (_) {}
        location.href = "/verify?reauth=1";
      });
    }
  }

  function setNavOpen(open) {
    // Desktop keeps a persistent left rail — drawer behavior is mobile-only.
    if (window.matchMedia("(min-width: 1101px)").matches) {
      syncDesktopNav();
      return;
    }
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

  function syncDesktopNav() {
    const desktop = window.matchMedia("(min-width: 1101px)").matches;
    document.body.classList.toggle("reddit-nav-desktop", desktop);
    if (!desktop) return;
    document.body.classList.remove("reddit-nav-open");
    document.documentElement.classList.remove("reddit-nav-lock");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    if (backdrop) backdrop.hidden = true;
    if (leftNav) {
      leftNav.hidden = false;
      leftNav.setAttribute("aria-hidden", "false");
    }
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Community menu");
    }
  }

  // —— Notifications popover (bell) ——
  let notifCache = [];
  let notifLoaded = false;
  let notifSeq = 0;

  function renderNotifPanel(notes) {
    const list = document.getElementById("notif-list");
    if (!list) return;
    notifCache = collapseAppUpdateNotes(notes);
    if (!notifCache.length) {
      list.innerHTML = `<p class="muted reddit-notif-empty" id="notif-empty">No new notifications</p>`;
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

  let seenNotifIds = new Set();
  let notifWatchReady = false;
  let localAppUpdateNotified = false;

  async function refreshNotifications({ open = false } = {}) {
    const seq = ++notifSeq;
    try {
      const res = await fetch("/api/synk-community?inbox=1", { headers: hubHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to load notifications");
      if (typeof data.unreadCount === "number") {
        unreadCount = data.unreadCount;
        updateInboxBadge();
      }
      if (seq !== notifSeq) return;
      notifLoaded = true;
      const notes = collapseAppUpdateNotes(
        Array.isArray(data.notifications) ? data.notifications : []
      );
      if (notifWatchReady && window.SynkPush && window.SynkPush.maybeLocalNotify) {
        notes.forEach((note) => {
          const id = String((note && note.id) || "");
          if (!id || seenNotifIds.has(id) || note.readAt) return;
          seenNotifIds.add(id);
          // Don't stack local alerts for the same unread release note.
          if (isAppUpdateKind(note.kind)) {
            if (localAppUpdateNotified) return;
            localAppUpdateNotified = true;
          }
          window.SynkPush.maybeLocalNotify(note);
        });
      } else {
        notes.forEach((note) => {
          const id = String((note && note.id) || "");
          if (id) seenNotifIds.add(id);
          if (isAppUpdateKind(note && note.kind) && !note.readAt) {
            localAppUpdateNotified = true;
          }
        });
        notifWatchReady = true;
      }
      renderNotifPanel(notes);
      lastNotifications = notes.slice();
      if (open) setNotifOpen(true);
    } catch (err) {
      const list = document.getElementById("notif-list");
      if (list) list.innerHTML = `<p class="muted reddit-notif-empty">Unable to load notifications</p>`;
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
        if (list) list.innerHTML = plainLoadingHtml("Loading notifications");
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
      const prev = (notifCache.length ? notifCache : lastNotifications || []).slice();
      notifSeq += 1;
      const seq = notifSeq;
      notifMark.classList.add("is-busy");
      renderNotifPanel([]);
      lastNotifications = [];
      unreadCount = 0;
      updateInboxBadge();
      localAppUpdateNotified = false;
      prev.forEach((note) => {
        if (isAppUpdateKind(note && note.kind) && note.id) {
          seenNotifIds.delete(String(note.id));
        }
      });
      try {
        const data = await communityAction({ action: "mark-read" });
        if (seq !== notifSeq) return;
        const notes = Array.isArray(data.notifications) ? data.notifications : [];
        renderNotifPanel(notes);
        lastNotifications = notes.slice();
        unreadCount = typeof data.unreadCount === "number" ? data.unreadCount : 0;
        updateInboxBadge();
      } catch (err) {
        if (seq === notifSeq) {
          renderNotifPanel(prev);
          lastNotifications = prev.slice();
          unreadCount = prev.filter((n) => !n.readAt).length;
          updateInboxBadge();
          showToast(err.message || "Unable to update");
        }
      } finally {
        notifMark.classList.remove("is-busy");
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

  function releaseNotesCategoryMeta(title, audience) {
    const label = String(title || "").trim();
    const lower = label.toLowerCase();
    if (audience === "beta" || /\bbeta|tester|testing\b/.test(lower)) {
      return { key: "testing", flair: "Testing", title: label || "For beta testers" };
    }
    if (audience === "staff" || /\bstaff\b/.test(lower)) {
      return { key: "staff", flair: "Staff", title: label || "Staff notes" };
    }
    if (/^new\b/.test(lower)) {
      return { key: "new", flair: "New features", title: label || "New features" };
    }
    if (/^bug\s*fix|^fix/.test(lower)) {
      return { key: "fixes", flair: "Bug fixes", title: label || "Bug fixes" };
    }
    if (/improv/.test(lower)) {
      return { key: "improvements", flair: "Improvements", title: label || "Improvements" };
    }
    return { key: "update", flair: "What's new", title: label || "What's new" };
  }

  function renderReleaseNotesEmbeds(embeds, blocks) {
    if (Array.isArray(embeds) && embeds.length) {
      return `<div class="rn-feed">${embeds
        .map((embed) => {
          const audience = String(embed.audience || "everyone");
          const meta = releaseNotesCategoryMeta(embed.title, audience);
          const audienceBadge =
            audience === "beta"
              ? `<span class="rn-audience">Beta</span>`
              : audience === "staff"
                ? `<span class="rn-audience">Staff</span>`
                : "";
          return `<article class="rn-card" data-category="${escapeHtml(meta.key)}" data-audience="${escapeHtml(audience)}">
            <header class="rn-card-head">
              <span class="rn-flair" data-category="${escapeHtml(meta.key)}">${escapeHtml(meta.flair)}</span>
              ${audienceBadge}
              ${meta.title && meta.title.toLowerCase() !== meta.flair.toLowerCase()
                ? `<h3 class="rn-card-title">${escapeHtml(meta.title)}</h3>`
                : ""}
            </header>
            <div class="rn-card-body release-notes-md">${markdownToSafeHtml(embed.markdown || "")}</div>
          </article>`;
        })
        .join("")}</div>`;
    }
    return renderReleaseNotesBlocks(blocks || []);
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
    body.innerHTML = plainLoadingHtml("Loading release notes");
    if (sub) {
      sub.textContent = "A plain-language look at what’s new in this Synk update";
    }
    try {
      const ver = String(version || "").trim();
      const queryVer = ver || "latest";
      const res = await fetch(
        `/api/synk-community?releaseNotes=${encodeURIComponent(queryVer)}`,
        { headers: hubHeaders() }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to load release notes");
      if (sub) {
        const short = String(data.version || ver).slice(0, 10);
        sub.textContent = data.isStaff
          ? `Update ${short} · full staff notes`
          : data.isBetaTester
            ? `Update ${short} · includes beta notes`
            : `Update ${short}`;
      }
      body.innerHTML = renderReleaseNotesEmbeds(data.embeds || [], data.blocks || []);
    } catch (err) {
      body.innerHTML = `<p class="muted">${escapeHtml(err.message || "Unable to load release notes")}</p>`;
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
      showToast(err.message || "An unexpected error occurred. Please try again.");
      sibling.forEach((btn) => { btn.disabled = false; });
    }
  });
  // Prefetch notifications after first paint so the bell feels instant.
  setTimeout(() => {
    if (me && publicUsername) refreshNotifications().catch(() => {});
  }, 1200);

  // Real device notifications (Web Push) once a hub session is present.
  setTimeout(() => {
    if (!hubToken || !window.SynkPush) return;
    window.SynkPush.bootstrapPush(hubHeaders(), { offerBanner: true }).catch(() => {});
    if (window.SynkPush.watchInstallPrompt) {
      window.SynkPush.watchInstallPrompt(() => hubHeaders());
    }
  }, 1800);

  if (window.SynkPush && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event && event.data;
      if (!data || data.type !== "synk-notification-click" || !data.url) return;
      try {
        window.location.href = data.url;
      } catch (_) {}
    });
  }


  // Start closed — sidebar opens from the profile avatar.
  setNavOpen(false);
  syncDesktopNav();
  window.addEventListener("resize", () => {
    try {
      syncDesktopNav();
      syncTabBar();
    } catch (_) {}
  });

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
    if (window.SynkSession) window.SynkSession.clearSession();
    else {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
    try {
      localStorage.removeItem(PERSONA_KEY);
      sessionStorage.removeItem(PERSONA_KEY);
    } catch (_) {}
    location.href = "/verify?reauth=1";
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
    const shareBtn = e.target.closest("[data-share-post], [data-share-comment]");
    if (shareBtn) {
      e.preventDefault();
      const postId = shareBtn.getAttribute("data-share-post");
      const commentId = shareBtn.getAttribute("data-share-comment");
      const url = postId
        ? `${location.origin}/community/post/${postId}`
        : `${location.origin}${location.pathname}${location.search}#comment-${commentId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      const size = commentId ? 14 : 16;
      shareBtn.textContent = "Copied";
      setTimeout(() => {
        shareBtn.innerHTML = `${ico("share", size)} <span>Share</span>`;
      }, 1200);
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
      const replyAttr = suggestionBtn.getAttribute("data-suggestion-reply");
      if (!postId || !status) return;
      try {
        const data = await communityAction({
          action: "set-suggestion-status",
          postId,
          status,
          reply: replyAttr != null ? replyAttr : undefined,
        });
        const patch = {
          suggestionStatus: data.suggestionStatus || status,
          suggestionReply:
            data.suggestionReply != null ? data.suggestionReply : replyAttr != null ? replyAttr : undefined,
        };
        lastPosts = (lastPosts || []).map((p) =>
          String(p.id) === String(postId) ? { ...p, ...patch } : p
        );
        if (activePost && String(activePost.id) === String(postId)) {
          activePost = { ...activePost, ...patch };
          renderPostDetail(activePost);
        }
        renderFeed(lastPosts);
        showToast(suggestionStatusLabel(status));
      } catch (err) {
        showToast(err.message || "Could not update suggestion");
      }
      return;
    }

    const pinBtn = e.target.closest("[data-pin-post]");
    if (pinBtn) {
      e.preventDefault();
      const postId = pinBtn.getAttribute("data-pin-post");
      const pinned = pinBtn.getAttribute("data-pinned") === "1";
      if (!postId) return;
      try {
        const data = await communityAction({ action: "pin-post", postId, pinned });
        lastPosts = (lastPosts || []).map((p) =>
          String(p.id) === String(postId) ? { ...p, isPinned: !!data.isPinned } : p
        );
        if (activePost && String(activePost.id) === String(postId)) {
          activePost = { ...activePost, isPinned: !!data.isPinned };
          renderPostDetail(activePost);
        }
        renderFeed(lastPosts);
        showToast(data.isPinned ? "Pinned" : "Unpinned");
      } catch (err) {
        showToast(err.message || "Could not pin post");
      }
      return;
    }
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-suggestion-form]");
    if (!form) return;
    e.preventDefault();
    const postId = form.getAttribute("data-suggestion-form");
    const statusSel = form.querySelector("[data-suggestion-status-select]");
    const replyEl = form.querySelector("textarea");
    if (!postId) return;
    try {
      const data = await communityAction({
        action: "set-suggestion-status",
        postId,
        status: (statusSel && statusSel.value) || "open",
        reply: replyEl ? replyEl.value : "",
      });
      const patch = {
        suggestionStatus: data.suggestionStatus || (statusSel && statusSel.value) || "open",
        suggestionReply: data.suggestionReply != null ? data.suggestionReply : replyEl ? replyEl.value : "",
      };
      lastPosts = (lastPosts || []).map((p) =>
        String(p.id) === String(postId) ? { ...p, ...patch } : p
      );
      if (activePost && String(activePost.id) === String(postId)) {
        activePost = { ...activePost, ...patch };
        renderPostDetail(activePost);
      }
      renderFeed(lastPosts);
      showToast("Reply saved");
    } catch (err) {
      showToast(err.message || "Could not save reply");
    }
  });

  function setForumCreateOpen(open) {
    const modal = document.getElementById("forum-create-modal");
    if (!modal) return;
    modal.hidden = !open;
    document.body.classList.toggle("forum-create-open", !!open);
    if (open) {
      const tagsHost = document.getElementById("forum-create-tags");
      forumSelectedTags = [];
      if (tagsHost) {
        tagsHost.innerHTML = SUGGESTION_TAGS.map(
          (tag) =>
            `<button type="button" class="forum-tag-pick" data-forum-tag="${escapeHtml(tag.id)}" style="--forum-tag:${escapeHtml(
              tag.color
            )}">${escapeHtml(tag.label)}</button>`
        ).join("");
      }
      const title = document.getElementById("forum-create-title-input");
      const body = document.getElementById("forum-create-body");
      const status = document.getElementById("forum-create-status");
      if (title) title.value = "";
      if (body) body.value = "";
      if (status) status.textContent = "";
      if (title) title.focus();
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#synk-hub-forum-create")) {
      e.preventDefault();
      setForumCreateOpen(true);
      return;
    }
    if (e.target.closest("[data-forum-close]")) {
      e.preventDefault();
      setForumCreateOpen(false);
      return;
    }
    const tagBtn = e.target.closest("[data-forum-tag]");
    if (tagBtn && tagBtn.closest("#forum-create-tags")) {
      e.preventDefault();
      const id = tagBtn.getAttribute("data-forum-tag");
      if (!id) return;
      if (forumSelectedTags.includes(id)) {
        forumSelectedTags = forumSelectedTags.filter((t) => t !== id);
      } else if (forumSelectedTags.length < 3) {
        forumSelectedTags = forumSelectedTags.concat(id);
      }
      document.querySelectorAll("#forum-create-tags [data-forum-tag]").forEach((btn) => {
        btn.classList.toggle("is-selected", forumSelectedTags.includes(btn.getAttribute("data-forum-tag")));
      });
    }
  });

  const forumCreateForm = document.getElementById("forum-create-form");
  if (forumCreateForm) {
    forumCreateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("forum-create-status");
      const titleEl = document.getElementById("forum-create-title-input");
      const bodyEl = document.getElementById("forum-create-body");
      const title = titleEl ? titleEl.value.trim() : "";
      const body = bodyEl ? bodyEl.value.trim() : "";
      if (title.length < 3) {
        if (status) status.textContent = "Add a short title";
        return;
      }
      if (body.length < 3) {
        if (status) status.textContent = "Add a bit more detail";
        return;
      }
      if (status) status.textContent = "Posting…";
      try {
        const data = await communityAction({
          action: "post",
          type: "text",
          title,
          body,
          group: route.slug || "synk",
          channel: activeChannelSlug || "ideas",
          tags: forumSelectedTags.slice(),
          asUsername: activePersona || (me && me.username) || undefined,
        });
        setForumCreateOpen(false);
        if (data.post && data.post.id) {
          await navigate(
            { type: "post", slug: "", username: "", postId: String(data.post.id) },
            { replace: false }
          );
        } else {
          await loadCommunity();
        }
        showToast("Suggestion posted");
      } catch (err) {
        if (status) status.textContent = err.message || "Could not post";
      }
    });
  }

  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-synk-channels-close]");
    if (closeBtn) {
      e.preventDefault();
      setSynkChannelsOpen(false);
      return;
    }
    const toggle = e.target.closest("#synk-channels-toggle");
    if (toggle) {
      e.preventDefault();
      const open = isSynkChannelsPhone()
        ? !document.body.classList.contains("synk-channels-open")
        : document.body.classList.contains("synk-channels-collapsed");
      setSynkChannelsOpen(open);
      return;
    }
    const chBtn = e.target.closest("[data-discord-channel]");
    if (!chBtn) return;
    e.preventDefault();
    const slug = chBtn.getAttribute("data-discord-channel");
    if (!slug || !route.slug) return;
    activeChannelSlug = slug;
    if (isSynkChannelsPhone()) setSynkChannelsOpen(false);
    navigate({ type: "group", slug: route.slug, username: "", channel: slug }).catch(() => {});
  });

  try {
    const synkChannelsMq = window.matchMedia("(max-width: 767px)");
    const onSynkChannelsMq = () => syncSynkChannelsForViewport();
    if (synkChannelsMq.addEventListener) synkChannelsMq.addEventListener("change", onSynkChannelsMq);
    else if (synkChannelsMq.addListener) synkChannelsMq.addListener(onSynkChannelsMq);
  } catch (_) {}

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.body.classList.contains("forum-create-open")) {
      setForumCreateOpen(false);
      return;
    }
    if (document.body.classList.contains("synk-channels-open")) {
      setSynkChannelsOpen(false);
    }
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

  async function toggleGroupMembership(slug, sourceBtn) {
    const groupSlug = String(slug || "").trim();
    if (!groupSlug) return;
    const group = (groups || []).find((g) => g.slug === groupSlug) || (activeGroupDetail && activeGroupDetail.slug === groupSlug ? activeGroupDetail : null);
    const currentlyJoined = group ? isGroupJoined(group) : route.type === "group" && route.slug === groupSlug && activeGroupJoined;
    const next = !currentlyJoined;
    if (!next) {
      const label = group && (group.isOfficial || group.slug === "synk") ? "Synk" : (group && group.name) || groupSlug;
      if (!window.confirm(`Leave ${label}? You can rejoin anytime.`)) return;
    }
    if (sourceBtn) {
      sourceBtn.disabled = true;
      sourceBtn.textContent = next ? "Joining…" : "Leaving…";
    }
    if (route.type === "group" && route.slug === groupSlug) {
      activeGroupJoined = next;
      syncJoinButtons();
    }
    try {
      const data = await communityAction({
        action: "join",
        group: groupSlug,
        joined: next,
      });
      const joinedNow = !!(data.joined != null ? data.joined : next);
      groups = (groups || []).map((g) =>
        g.slug === groupSlug
          ? {
              ...g,
              joined: joinedNow,
              memberCount: typeof data.memberCount === "number" ? data.memberCount : g.memberCount,
            }
          : g
      );
      if (route.type === "group" && route.slug === groupSlug) {
        activeGroupJoined = joinedNow;
        if (activeGroupDetail) {
          activeGroupDetail.joined = joinedNow;
          if (typeof data.memberCount === "number") activeGroupDetail.memberCount = data.memberCount;
        }
        syncJoinButtons();
        const memberCount = activeGroupDetail && activeGroupDetail.memberCount;
        if (memberCount != null) {
          setText(
            "view-sub",
            [route.slug || "", `${Number(memberCount).toLocaleString()} member${Number(memberCount) === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")
          );
        }
      }
      if (route.type === "groups") renderGroupsPage();
      showToast(joinedNow ? "Joined" : "Left community");
    } catch (err) {
      if (route.type === "group" && route.slug === groupSlug) {
        activeGroupJoined = currentlyJoined;
        syncJoinButtons();
      }
      if (route.type === "groups") renderGroupsPage();
      showToast((err && err.message) || "Could not update membership");
    } finally {
      if (sourceBtn) sourceBtn.disabled = false;
    }
  }

  ["join-community-btn", "about-join-btn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (route.type !== "group" || !route.slug) return;
      toggleGroupMembership(route.slug, btn).catch(() => {});
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
    hideSynkBootLoader();
  } else {
    communityApp.hidden = false;
    loadCommunity().catch((err) => {
      hideSynkBootLoader();
      const msg = String((err && err.message) || "");
      const authDead = /sign in|session expired|unauthorized|log in again/i.test(msg);
      if (authDead) {
        communityApp.hidden = true;
        lockedCard.hidden = false;
        document.getElementById("locked-help").textContent =
          msg || "Session expired. Sign in again.";
        return;
      }
      // Transient deploy/network blip — keep the stay-signed-in session and retry once.
      communityApp.hidden = false;
      lockedCard.hidden = true;
      setTimeout(() => {
        loadCommunity().catch((err2) => {
          hideSynkBootLoader();
          communityApp.hidden = true;
          lockedCard.hidden = false;
          document.getElementById("locked-help").textContent =
            (err2 && err2.message) || msg || "Unable to load Community. Please try again.";
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
            <div class="muted" style="font-size:0.75rem;">sort ${escapeHtml(String(item.sortOrder ?? 0))} · ${item.active === false ? "inactive" : "active"}${item.updateVersion ? ` · update ${escapeHtml(item.updateVersion)}` : " · standing"}</div>
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

  let betaFeedbackCache = [];
  let betaFeedbackActiveId = null;

  function renderBetaFeedbackChat(thread) {
    const chat = document.getElementById("beta-feedback-chat");
    const list = document.getElementById("beta-feedback-chat-messages");
    const title = document.getElementById("beta-feedback-chat-title");
    const meta = document.getElementById("beta-feedback-chat-meta");
    if (!chat || !list) return;
    if (!thread) {
      chat.hidden = true;
      betaFeedbackActiveId = null;
      return;
    }
    betaFeedbackActiveId = thread.id;
    chat.hidden = false;
    const who = thread.authorDisplayName || thread.authorUsername || "Tester";
    const handle = thread.authorUsername ? `@${thread.authorUsername}` : "";
    if (title) title.textContent = who;
    if (meta) {
      const when = thread.updatedAt || thread.createdAt
        ? new Date(thread.updatedAt || thread.createdAt).toLocaleString()
        : "";
      meta.textContent = [handle, when ? `Updated ${when}` : ""].filter(Boolean).join(" · ");
    }
    const messages = Array.isArray(thread.messages) && thread.messages.length
      ? thread.messages
      : [{ body: thread.body, isMine: false, isStaff: false, createdAt: thread.createdAt }];
    list.innerHTML = messages
      .map((m) => {
        const mine = !!m.isMine;
        const label = mine
          ? "You"
          : m.isStaff
            ? "Staff"
            : m.authorDisplayName || m.authorUsername || who;
        const stamp = m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
        return `
          <div class="tm-fb-msg ${mine ? "is-mine" : "is-theirs"}">
            <div class="tm-fb-bubble">
              <span class="tm-fb-who">${escapeHtml(label)}</span>
              <p>${escapeHtml(m.body)}</p>
              ${stamp ? `<time class="muted">${escapeHtml(stamp)}</time>` : ""}
            </div>
          </div>`;
      })
      .join("");
    list.scrollTop = list.scrollHeight;
    document.querySelectorAll("#beta-feedback-thread-list [data-open-feedback]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-open-feedback") === String(thread.id));
    });
  }

  async function loadBetaFeedbackAdmin(preserveActive) {
    if (!(me && me.isStaff)) return;
    const list = document.getElementById("beta-feedback-thread-list");
    if (!list) return;
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({ action: "beta-admin-feedback" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load feedback");
      betaFeedbackCache = data.feedback || [];
      if (!betaFeedbackCache.length) {
        list.innerHTML = '<p class="muted" style="margin:0;font-size:0.85rem;">No feedback conversations yet.</p>';
        renderBetaFeedbackChat(null);
        return;
      }
      list.innerHTML = betaFeedbackCache
        .map((thread) => {
          const who = thread.authorDisplayName || thread.authorUsername || "Tester";
          const handle = thread.authorUsername ? `@${thread.authorUsername}` : "";
          const preview = String(thread.preview || thread.body || "").slice(0, 120);
          const when = thread.updatedAt || thread.createdAt
            ? new Date(thread.updatedAt || thread.createdAt).toLocaleString()
            : "";
          const count = Number(thread.messageCount) || (thread.messages || []).length || 1;
          return `
            <button class="beta-fb-thread-btn" type="button" data-open-feedback="${escapeHtml(thread.id)}">
              <span class="beta-fb-thread-top">
                <strong>${escapeHtml(who)}</strong>
                <span class="muted">${escapeHtml(String(count))} msg</span>
              </span>
              ${handle ? `<span class="muted beta-fb-thread-handle">${escapeHtml(handle)}</span>` : ""}
              <span class="beta-fb-thread-preview">${escapeHtml(preview)}</span>
              <span class="muted beta-fb-thread-time">${escapeHtml(when)}</span>
            </button>`;
        })
        .join("");
      const keepId = preserveActive ? betaFeedbackActiveId : null;
      const active = keepId
        ? betaFeedbackCache.find((t) => String(t.id) === String(keepId))
        : null;
      renderBetaFeedbackChat(active || null);
    } catch (err) {
      list.innerHTML = `<p class="muted">${escapeHtml(err.message || "Could not load feedback")}</p>`;
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
            updateVersion: document.getElementById("beta-agenda-version").value,
            sortOrder: Number(document.getElementById("beta-agenda-sort").value || 0),
            active: document.getElementById("beta-agenda-active").checked,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save agenda item");
        document.getElementById("beta-agenda-id").value = "";
        document.getElementById("beta-agenda-title").value = "";
        document.getElementById("beta-agenda-detail").value = "";
        document.getElementById("beta-agenda-version").value = "";
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
      document.getElementById("beta-agenda-version").value = "";
      document.getElementById("beta-agenda-sort").value = "0";
      document.getElementById("beta-agenda-active").checked = true;
      const status = document.getElementById("beta-agenda-status");
      if (status) status.textContent = "";
    });
  }
  const agendaClearAll = document.getElementById("beta-agenda-clear-all-btn");
  if (agendaClearAll) {
    agendaClearAll.addEventListener("click", async () => {
      if (!confirm("Clear every agenda item for all testers?")) return;
      const status = document.getElementById("beta-agenda-status");
      if (status) status.textContent = "Clearing…";
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({ action: "beta-clear-agenda" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not clear agenda");
        if (status) status.textContent = `Cleared ${Number(data.cleared) || 0} item(s)`;
        await loadBetaAgendaAdmin();
      } catch (err) {
        if (status) status.textContent = err.message || "Could not clear agenda";
      }
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
        document.getElementById("beta-agenda-version").value = item.updateVersion || "";
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

  const betaFeedbackList = document.getElementById("beta-feedback-thread-list");
  if (betaFeedbackList) {
    betaFeedbackList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-feedback]");
      if (!btn) return;
      const id = btn.getAttribute("data-open-feedback");
      const thread = (betaFeedbackCache || []).find((t) => String(t.id) === String(id));
      renderBetaFeedbackChat(thread || null);
    });
  }
  const betaFeedbackClose = document.getElementById("beta-feedback-chat-close");
  if (betaFeedbackClose) {
    betaFeedbackClose.addEventListener("click", () => renderBetaFeedbackChat(null));
  }
  const betaFeedbackReplyForm = document.getElementById("beta-feedback-reply-form");
  if (betaFeedbackReplyForm) {
    betaFeedbackReplyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!betaFeedbackActiveId) return;
      const status = document.getElementById("beta-feedback-reply-status");
      const bodyEl = document.getElementById("beta-feedback-reply-body");
      const btn = betaFeedbackReplyForm.querySelector('button[type="submit"]');
      if (!bodyEl) return;
      if (status) status.textContent = "Sending…";
      if (btn) btn.disabled = true;
      try {
        const res = await fetch("/api/synk-community", {
          method: "POST",
          headers: hubHeaders(),
          body: JSON.stringify({
            action: "beta-reply-feedback",
            threadId: betaFeedbackActiveId,
            body: bodyEl.value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not reply");
        bodyEl.value = "";
        if (status) status.textContent = "Sent";
        if (data.feedback) {
          const idx = betaFeedbackCache.findIndex((t) => String(t.id) === String(data.feedback.id));
          if (idx >= 0) betaFeedbackCache[idx] = data.feedback;
          else betaFeedbackCache.unshift(data.feedback);
          renderBetaFeedbackChat(data.feedback);
        }
        await loadBetaFeedbackAdmin(true);
      } catch (err) {
        if (status) status.textContent = err.message || "Could not reply";
      } finally {
        if (btn) btn.disabled = false;
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
        loadBetaFeedbackAdmin(true);
      }
      refreshModToolsChrome();
    };
  }



  


  document.addEventListener("click", async (e) => {
    const assignBtn = e.target.closest("[data-tag-assign]");
    const removeBtn = e.target.closest("[data-tag-unassign]");
    if (!assignBtn && !removeBtn) return;
    if (!canManageTags()) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (assignBtn) {
        const targetType = assignBtn.getAttribute("data-tag-target") || "";
        const targetKey = assignBtn.getAttribute("data-tag-key") || "";
        const root = assignBtn.closest(".community-tag-manager");
        const select = root && root.querySelector("[data-tag-select]");
        const tagId = select && select.value;
        if (!tagId) return;
        await assignTagFromUi({ targetType, targetKey, tagId });
        await loadCommunity();
        return;
      }
      if (removeBtn) {
        const targetType = removeBtn.getAttribute("data-tag-target") || "";
        const targetKey = removeBtn.getAttribute("data-tag-key") || "";
        const tagId = removeBtn.getAttribute("data-tag-unassign") || "";
        await unassignTagFromUi({ targetType, targetKey, tagId });
        await loadCommunity();
      }
    } catch (err) {
      alert(err.message || "Tag update failed");
    }
  });

})();
