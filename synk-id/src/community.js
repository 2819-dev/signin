(() => {
  const STORAGE_KEY = "synk_member_session";
  const PERSONA_KEY = "synk_community_persona";
  const RECENT_KEY = "synk_community_recent";
  const SORT_KEY = "synk_community_sort";

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
  let activePersona = "";
  let me = null;
  let groups = [];
  let staff = [];
  let alts = [];
  let ownerUsername = "vision";
  let tags = [];
  let myTags = [];
  let route = { type: "home", slug: "", username: "" };
  let lastPosts = [];
  let lastComments = [];
  let lastNotifications = [];
  let currentSort = "new";
  let activePostId = "";
  let unreadCount = 0;
  let activeSubmitType = "text";
  let activeGroupJoined = false;

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

  function tagChip(tag, { compact = false, canPin = false } = {}) {
    if (!tag) return "";
    const color = escapeHtml(tag.color || "#6366f1");
    const name = escapeHtml(tag.name || "Tag");
    const desc = escapeHtml(tag.description || "");
    const id = escapeHtml(String(tag.id || ""));
    const pinned = tag.pinned ? "1" : "0";
    const initial = escapeHtml(tagInitial(tag));
    const cls = [
      "synk-tag-badge",
      compact ? "is-compact" : "",
      tag.pinned ? "is-pinned" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<button type="button" class="${cls}" style="--tag-color:${color}" data-tag-badge="1" data-tag-id="${id}" data-tag-name="${name}" data-tag-desc="${desc}" data-tag-pinned="${pinned}" data-can-pin="${canPin ? "1" : "0"}" aria-label="${name}" aria-expanded="false" title="${name}"><span class="synk-tag-badge-icon" aria-hidden="true">${initial}</span></button>`;
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
    if (icon) {
      icon.textContent = (name || "?").slice(0, 1).toUpperCase();
      icon.style.setProperty("--tag-color", color);
    }
    if (nameEl) nameEl.textContent = name;
    if (descEl) descEl.textContent = desc || "No description.";
    if (pinBtn) {
      pinBtn.hidden = !canPin;
      pinBtn.textContent = pinned ? "Unpin from name" : "Pin next to name";
      pinBtn.classList.toggle("btn-primary", pinned);
      pinBtn.classList.toggle("btn-secondary", !pinned);
      pinBtn.setAttribute("data-pin-tag", tagId);
      pinBtn.setAttribute("data-tag-pinned", pinned ? "1" : "0");
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
          return `
            <div class="community-staff-row">
              <div class="synk-tag-mod-row">
                ${tagChip(tag)}
                <div>
                  <strong>${escapeHtml(tag.name || "")}</strong>
                  <div class="muted" style="font-size:0.78rem;margin-top:2px;">${escapeHtml(tag.description || "No description")}</div>
                </div>
              </div>
              <button class="btn btn-secondary btn-compact" type="button" data-delete-tag="${escapeHtml(tag.id)}">Delete</button>
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
    return Math.max(1, Math.round(postScore(post) * 10));
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
    const badge = document.getElementById("inbox-badge");
    if (!badge) return;
    const n = Number(unreadCount) || 0;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 99 ? "99+" : String(n);
    } else {
      badge.hidden = true;
      badge.textContent = "0";
    }
  }

  function apiSort() {
    const sort = route.type === "popular" ? "hot" : currentSort || "new";
    if (sort === "best") return "hot";
    if (sort === "hot" || sort === "top" || sort === "new") return sort;
    return "new";
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
    document.querySelectorAll(".reddit-sort-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-sort") === sort);
    });
  }

  function closeUserMenu() {
    const dd = document.getElementById("user-menu-dropdown");
    const btn = document.getElementById("user-menu-btn");
    if (dd) dd.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function setComposerOpen(open) {
    if (open) {
      navigate({ type: "submit", slug: "", username: "" }).then(() => {
        if (route.type === "group" && route.slug) {
          history.replaceState(route, "", `/community/submit?group=${encodeURIComponent(route.slug)}`);
        }
      }).catch(() => {});
      return;
    }
    const collapsed = document.getElementById("composer-collapsed");
    const expanded = document.getElementById("composer-expanded");
    if (!collapsed || !expanded) return;
    collapsed.hidden = false;
    expanded.hidden = true;
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
      rightRail.hidden =
        route.type === "settings" ||
        route.type === "submit" ||
        route.type === "mod" ||
        route.type === "post" ||
        route.type === "inbox";
    }
    const aboutCreated = document.getElementById("about-created");
    const aboutMembers = document.getElementById("about-members");
    if (aboutCreated) aboutCreated.textContent = "2024";
    if (aboutMembers) aboutMembers.textContent = String(Math.max(groups.length * 12, posts.length || 0));
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
      if (aboutTitle) aboutTitle.textContent = `${profile.username || route.username || ""}`;
      if (aboutBlurb) aboutBlurb.textContent = "Member profile";
      if (statPostsLabel) statPostsLabel.textContent = "Posts";
      if (statPosts) statPosts.textContent = String(profile.postCount != null ? profile.postCount : posts.length);
      return;
    }
    if (route.type === "group") {
      const group = (data && data.group) || groups.find((g) => g.slug === route.slug) || null;
      if (aboutTitle) aboutTitle.textContent = group ? `About ${group.slug}` : "About community";
      if (aboutBlurb) aboutBlurb.textContent = (group && group.description) || "A Synk Community group.";
      if (statPostsLabel) statPostsLabel.textContent = "Posts";
      if (statPosts) statPosts.textContent = String(group && group.postCount != null ? group.postCount : posts.length);
      return;
    }
    if (route.type === "popular") {
      if (aboutTitle) aboutTitle.textContent = "Popular";
      if (aboutBlurb) aboutBlurb.textContent = "Trending posts across Synk communities.";
      if (statPostsLabel) statPostsLabel.textContent = "Visible posts";
      if (statPosts) statPosts.textContent = String(posts.length);
      return;
    }
    if (aboutTitle) aboutTitle.textContent = "Home";
    if (aboutBlurb) aboutBlurb.textContent = "Your Synk Community feed across all groups.";
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
    let m = path.match(/^\/community\/post\/([a-z0-9_-]+)$/i);
    if (m) return { type: "post", slug: "", username: "", postId: m[1] };
    m = path.match(/^\/community\/(?:group|g)\/([a-z0-9-]+)$/i);
    if (m) return { type: "group", slug: m[1].toLowerCase(), username: "" };
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
    if (next.type === "post" && next.postId) return `/community/post/${encodeURIComponent(next.postId)}`;
    if (next.type === "group" && next.slug) return `/community/group/${encodeURIComponent(next.slug)}`;
    if (next.type === "user" && next.username) return `/user/${encodeURIComponent(next.username)}`;
    return "/community";
  }

  async function navigate(next, { replace = false } = {}) {
    route = next;
    const url = routeUrl(next);
    if (replace) history.replaceState(next, "", url);
    else history.pushState(next, "", url);
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
  }

  function personaOptions() {
    const options = [];
    if (publicUsername) {
      options.push({ username: publicUsername, label: "Primary", isAlt: false });
    }
    (alts || []).forEach((alt) => {
      options.push({
        username: alt.username,
        label: alt.label || "Alt",
        isAlt: true,
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
    personaSwitch.hidden = !(isOwner && publicUsername);
    // Always keep the account menu closed unless the user opens it.
    // (display:grid on .persona-menu would otherwise fight the hidden attribute.)
    closePersonaMenu();
    if (!isOwner) return;
    resolveActivePersona();
    const name = activePersona || "—";
    personaLabel.textContent = name;
    const personaAvatar = document.getElementById("persona-avatar");
    if (personaAvatar) {
      personaAvatar.textContent = String(activePersona || publicUsername || "S").slice(0, 1).toUpperCase();
    }
    const composerAvatar = document.getElementById("composer-avatar");
    if (composerAvatar) {
      composerAvatar.textContent = String(activePersona || publicUsername || "S").slice(0, 1).toUpperCase();
    }
    document.getElementById("composer-as").textContent = activePersona
      ? `Posting as ${activePersona}`
      : "Posting as —";
    // Keep tags/pins in sync with the active account (primary or alt).
    if (activePersona && me) {
      myTags = tagsForActivePersona();
      if (typeof renderMyTags === "function") renderMyTags();
    }
    personaMenu.innerHTML = personaOptions()
      .map((opt) => {
        const selected = opt.username === activePersona ? "is-selected" : "";
        const initial = String(opt.username || "?").slice(0, 1).toUpperCase();
        return `
          <button class="persona-menu-item ${selected}" type="button" role="option" data-persona="${escapeHtml(opt.username)}">
            <span class="persona-menu-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
            <span class="persona-menu-copy">
              <strong>${escapeHtml(opt.username)}</strong>
              <span>${escapeHtml(opt.label || (opt.isAlt ? "Account" : "Primary"))}</span>
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

  function setBannerMode(mode, visible) {
    const banner = document.getElementById("view-banner");
    if (!banner) return null;
    banner.dataset.mode = mode || "";
    banner.hidden = !visible;
    return banner;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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
              <strong>${escapeHtml(group.slug)}</strong>
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

  function renderFeed(posts) {
    lastPosts = Array.isArray(posts) ? posts.slice() : [];
    const ordered = sortedPosts(lastPosts).filter((p) => !p.hidden);
    if (!ordered.length) {
      feedEl.innerHTML = "";
      feedEmpty.hidden = false;
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
        return `
          <article class="reddit-post" data-post-id="${pid}">
            <div class="reddit-vote">
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">▲</button>
              <span class="reddit-vote-count">${score}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">▼</button>
            </div>
            <div class="reddit-post-main">
              <div class="reddit-post-meta">
                ${
                  showGroup
                    ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.slug)}</a><span class="muted">•</span>`
                    : ""
                }
                <span class="muted">Posted by</span>
                <a class="community-user-link" href="/user/${escapeHtml(username)}">${escapeHtml(username)}</a>
                ${tagChip(author.pinnedTag, { compact: true })}
                <span class="muted">${escapeHtml(formatRelative(post.createdAt))}</span>
              </div>
              <a class="reddit-post-title-link" href="/community/post/${pid}" data-open-post="${pid}">
                <h3 class="reddit-post-title">${escapeHtml(title)}</h3>
              </a>
              ${bodyText ? `<div class="reddit-post-body">${escapeHtml(bodyText)}</div>` : ""}
              ${media}
              <div class="reddit-post-actions">
                <a class="reddit-action" href="/community/post/${pid}" data-open-post="${pid}">💬 ${comments} Comments</a>
                <button class="reddit-action" type="button" data-share-post="${pid}">↗ Share</button>
                <button class="reddit-action ${saved ? "is-active" : ""}" type="button" data-save-post="${pid}">${saved ? "★ Saved" : "☆ Save"}</button>
                <button class="reddit-action" type="button" data-hide-post="${pid}">Hide</button>
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
          <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="post" data-post-id="${pid}" aria-label="Upvote">▲</button>
          <span class="reddit-vote-count">${displayScore(post)}</span>
          <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="post" data-post-id="${pid}" aria-label="Downvote">▼</button>
        </div>
        <div class="reddit-post-main">
          <div class="reddit-post-meta">
            ${group.slug ? `<a class="reddit-sub" href="/community/group/${escapeHtml(group.slug)}">${escapeHtml(group.slug)}</a><span class="muted">•</span>` : ""}
            <span class="muted">Posted by</span>
            <a class="community-user-link" href="/user/${escapeHtml(username)}">${escapeHtml(username)}</a>
            ${tagChip(author.pinnedTag, { compact: true })}
            <span class="muted">${escapeHtml(formatRelative(post.createdAt))}</span>
          </div>
          <h1 class="reddit-post-title reddit-post-title-lg">${escapeHtml(title)}</h1>
          ${bodyText ? `<div class="reddit-post-body reddit-post-body-lg">${escapeHtml(bodyText)}</div>` : ""}
          ${media}
          <div class="reddit-post-actions">
            <span class="reddit-action">💬 ${comments} Comments</span>
            <button class="reddit-action" type="button" data-share-post="${pid}">↗ Share</button>
            <button class="reddit-action ${saved ? "is-active" : ""}" type="button" data-save-post="${pid}">${saved ? "★ Saved" : "☆ Save"}</button>
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
      if (empty) empty.hidden = false;
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
              <button class="reddit-vote-btn up ${vote === 1 ? "is-active" : ""}" type="button" data-vote="up" data-target-type="comment" data-comment-id="${cid}" aria-label="Upvote">▲</button>
              <span class="reddit-vote-count">${Number(comment.score) || 0}</span>
              <button class="reddit-vote-btn down ${vote === -1 ? "is-active" : ""}" type="button" data-vote="down" data-target-type="comment" data-comment-id="${cid}" aria-label="Downvote">▼</button>
            </div>
            <div class="reddit-comment-main">
              <div class="reddit-post-meta">
                <a class="community-user-link" href="/user/${escapeHtml(username)}">${escapeHtml(username)}</a>
                ${tagChip(author.pinnedTag, { compact: true })}
                <span class="muted">• ${escapeHtml(formatRelative(comment.createdAt))}</span>
              </div>
              <div class="reddit-comment-body">${escapeHtml(comment.body || "")}</div>
            </div>
          </article>
        `;
      })
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
        const nid = escapeHtml(String(note.id || ""));
        const unread = !note.readAt;
        const postId = note.postId ? escapeHtml(String(note.postId)) : "";
        const body = escapeHtml(note.body || `${note.actorUsername || "Someone"} notified you`);
        return `
          <button class="reddit-inbox-row ${unread ? "is-unread" : ""}" type="button" data-inbox-id="${nid}" ${postId ? `data-open-post="${postId}"` : ""}>
            <div class="reddit-inbox-row-copy">
              <strong>${body}</strong>
              <span class="muted">${escapeHtml(formatRelative(note.createdAt))}</span>
            </div>
          </button>
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
    const onFeed = !onSettings && !onSubmit && !onMod && !onPost && !onInbox;
    if (feedView) feedView.hidden = needsUsername || !onFeed;
    if (settingsView) settingsView.hidden = needsUsername || !onSettings;
    if (submitView) submitView.hidden = needsUsername || !onSubmit;
    if (modView) modView.hidden = needsUsername || !onMod;
    if (postView) postView.hidden = needsUsername || !onPost;
    if (inboxView) inboxView.hidden = needsUsername || !onInbox;
    if (composerCard) {
      composerCard.hidden = needsUsername || !onFeed || route.type === "user";
    }
    const settingsNav = document.getElementById("settings-nav-link");
    if (settingsNav) settingsNav.classList.toggle("is-active", onSettings);
    const submitNav = document.getElementById("submit-nav-link");
    if (submitNav) submitNav.classList.toggle("is-active", onSubmit);
    const modNav = document.getElementById("mod-nav-link");
    if (modNav) modNav.classList.toggle("is-active", onMod);
    if (popularLink) popularLink.classList.toggle("is-active", route.type === "popular");
    const inboxBtn = document.getElementById("inbox-btn");
    if (inboxBtn) inboxBtn.classList.toggle("is-active", onInbox);
    if (publicUsername) {
      const gateInput = document.getElementById("public-username");
      if (gateInput) gateInput.value = publicUsername;
      if (settingsUsername) settingsUsername.value = publicUsername;
      if (myProfileLink) {
        myProfileLink.hidden = false;
        myProfileLink.href = `/user/${encodeURIComponent(publicUsername)}`;
      }
      if (myProfileLabel) myProfileLabel.textContent = publicUsername;
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
  }

  function applyViewState(data) {
    renderCrumbs();
    if (profileMeta) {
      profileMeta.hidden = true;
      profileMeta.innerHTML = "";
    }
    syncSortTabs();

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
        ? `/community/submit?group=${encodeURIComponent(route.slug)}`
        : "/community/submit";
    if (createTop) createTop.href = submitHref;

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
      const uname = profile.username || route.username || "";
      setBannerMode("user", true);
      if (viewIcon) viewIcon.textContent = (uname || "?").slice(0, 1).toUpperCase();
      setText("view-title", uname);
      setText(
        "view-sub",
        profile.joinedAt ? `Joined ${formatWhen(profile.joinedAt)}` : uname
      );
      if (viewBlurb) {
        viewBlurb.hidden = true;
        viewBlurb.textContent = "";
      }
      if (joinBtn) joinBtn.hidden = true;
      if (profileMeta) {
        profileMeta.hidden = false;
        profileMeta.innerHTML = `
        <div class="community-profile-card">
          <div class="community-avatar" aria-hidden="true">${escapeHtml((uname || "?").slice(0, 1).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(uname)}</strong>
            ${tagChip(profile.pinnedTag, { compact: true })}
            <p class="muted" style="margin:4px 0 0;font-size:0.85rem;">
              ${Number(profile.postCount || 0)} posts
              ${profile.joinedAt ? ` · joined ${escapeHtml(formatWhen(profile.joinedAt))}` : ""}
            </p>
            <div class="community-tag-list synk-tag-badge-row" style="margin-top:10px;">
              ${
                (profile.tags || []).length
                  ? (profile.tags || [])
                      .map((tag) =>
                        tagChip(tag, {
                          canPin: canPinTagsFor(profile.username),
                        })
                      )
                      .join("")
                  : '<p class="muted" style="margin:0;font-size:0.85rem;">No tags yet.</p>'
              }
            </div>
          </div>
        </div>
      `;
      }
      composerCard.hidden = true;
      updateAboutRail(data);
      return;
    }
    if (route.type === "group") {
      const group = data.group || groups.find((g) => g.slug === route.slug) || null;
      if (group) pushRecent(group);
      const slug = (group && group.slug) || route.slug || "";
      const name = (group && group.name) || slug;
      const members =
        group && group.memberCount != null
          ? Number(group.memberCount)
          : group && group.postCount != null
            ? Math.max(Number(group.postCount) * 3, 1)
            : Math.max(groups.length * 12, 1);
      setBannerMode("group", true);
      if (viewIcon) viewIcon.textContent = (slug || "?").slice(0, 1).toUpperCase();
      setText("view-title", name);
      setText("view-sub", `${slug} · ${members.toLocaleString()} member${members === 1 ? "" : "s"}`);
      if (viewBlurb) {
        const desc = (group && group.description) || "";
        viewBlurb.textContent = desc;
        viewBlurb.hidden = !desc;
      }
      updateAboutRail(data);
      return;
    }
    if (route.type === "popular") {
      setBannerMode("popular", false);
      if (viewBlurb) {
        viewBlurb.hidden = true;
        viewBlurb.textContent = "";
      }
      updateAboutRail(data);
      return;
    }
    // home
    setBannerMode("home", false);
    if (viewBlurb) {
      viewBlurb.hidden = true;
      viewBlurb.textContent = "";
    }
    updateAboutRail(data);
  }

  async function loadCommunity() {
    let url = "/api/synk-community";
    const sort = apiSort();
    if (route.type === "post" && route.postId) {
      url += `?post=${encodeURIComponent(route.postId)}`;
    } else if (route.type === "inbox") {
      url += "?inbox=1";
    } else if (route.type === "popular") {
      url += `?feed=popular&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "home") {
      url += `?feed=home&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "group" && route.slug) {
      url += `?group=${encodeURIComponent(route.slug)}&sort=${encodeURIComponent(sort)}`;
    } else if (route.type === "user" && route.username) {
      url += `?user=${encodeURIComponent(route.username)}&sort=${encodeURIComponent(sort)}`;
    } else if (sort && sort !== "new") {
      url += `?sort=${encodeURIComponent(sort)}`;
    }

    const res = await fetch(url, { headers: hubHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load community");
    me = data.me || null;
    publicUsername = (me && me.publicUsername) || "";
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
    updateInboxBadge();
    applyUsernameState();
    applyStaffState();
    if (route.type !== "inbox") renderGroups();
    renderMyTags();

    if (route.type === "inbox") {
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
    const raw = String(document.getElementById("jump-input").value || "")
      .trim()
      .toLowerCase();
    if (!raw) return;
    if (raw.startsWith("g/") || raw.startsWith("r/")) {
      navigate({ type: "group", slug: raw.slice(2).replace(/[^a-z0-9-]/g, ""), username: "" });
      return;
    }
    if (raw.startsWith("u/") || raw.startsWith("@")) {
      navigate({
        type: "user",
        slug: "",
        username: raw.replace(/^u\//, "").replace(/^@/, "").replace(/[^a-z0-9_]/g, ""),
      });
      return;
    }
    if (/^[a-z0-9-]+$/.test(raw) && groups.some((g) => g.slug === raw)) {
      navigate({ type: "group", slug: raw, username: "" });
      return;
    }
    navigate({ type: "user", slug: "", username: raw.replace(/[^a-z0-9_]/g, "") });
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
    if (!res.ok) throw new Error(data.error || "Could not save username");
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
      status.textContent = err.message || "Could not save";
    }
  });

  document.getElementById("username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("username-status");
    try {
      await saveUsername(document.getElementById("public-username").value, status);
    } catch (err) {
      status.textContent = err.message || "Could not save";
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
        group: postGroup.value || route.slug || "general",
        asUsername: activePersona || publicUsername,
      };

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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create tag");
      document.getElementById("tag-name").value = "";
      document.getElementById("tag-description").value = "";
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

  if (tagCatalog) {
    tagCatalog.addEventListener("click", async (e) => {
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
      if (!res.ok) throw new Error(data.error || "Could not update pin");
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
      if (status) status.textContent = err.message || "Could not update pin";
    }
  }

  async function handlePinClick(e) {
    const btn = e.target.closest("[data-pin-tag]");
    if (!btn) return;
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
  bindNav(document.getElementById("inbox-btn"), { type: "inbox", slug: "", username: "" });

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
  function setNavOpen(open) {
    document.body.classList.toggle("reddit-nav-open", !!open);
    if (backdrop) backdrop.hidden = !open;
  }
  if (navToggle) navToggle.addEventListener("click", () => setNavOpen(!document.body.classList.contains("reddit-nav-open")));
  if (backdrop) backdrop.addEventListener("click", () => setNavOpen(false));

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
      setTimeout(() => { shareBtn.textContent = "↗ Share"; }, 1200);
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

  function syncJoinButtons() {
    const joined = route.type === "group" && route.slug && activeGroupJoined;
    ["join-community-btn", "about-join-btn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.hidden) return;
      btn.textContent = joined ? "Joined" : "Join";
      btn.classList.toggle("is-joined", !!joined);
    });
  }
  ["join-community-btn", "about-join-btn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (route.type !== "group" || !route.slug) return;
      const next = !activeGroupJoined;
      activeGroupJoined = next;
      syncJoinButtons();
      try {
        const data = await communityAction({
          action: "join",
          group: route.slug,
          joined: next,
        });
        activeGroupJoined = !!(data.joined != null ? data.joined : next);
        if (data.group) {
          groups = (groups || []).map((g) =>
            g.slug === route.slug ? { ...g, joined: activeGroupJoined } : g
          );
        }
        syncJoinButtons();
      } catch (_) {
        activeGroupJoined = !next;
        syncJoinButtons();
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
            (err2 && err2.message) || msg || "Could not load community. Try again.";
        });
      }, 1200);
    });
  }
})();
