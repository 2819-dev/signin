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
  let currentSort = "new";

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


  function tagChip(tag, { compact = false } = {}) {
    if (!tag) return "";
    const color = escapeHtml(tag.color || "#6366f1");
    const title = escapeHtml(tag.description || tag.name || "");
    const name = escapeHtml(tag.name || "");
    const cls = compact ? "community-tag-chip is-compact" : "community-tag-chip";
    return `<span class="${cls}" style="--tag-color:${color}" title="${title}">${name}</span>`;
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
              <div>
                ${tagChip(tag)}
                <div class="muted" style="font-size:0.78rem;margin-top:4px;">${escapeHtml(tag.description || "")}</div>
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
    myTags = (me && me.tags) || [];
    if (!myTags.length) {
      myTagsCard.hidden = true;
      myTagsList.innerHTML = "";
      return;
    }
    myTagsCard.hidden = route.type !== "settings";
    myTagsList.innerHTML = myTags
      .map((tag) => {
        const pinned = !!tag.pinned;
        return `
          <div class="community-tag-row">
            <div>
              ${tagChip(tag)}
              <div class="muted" style="font-size:0.78rem;margin-top:4px;">${escapeHtml(tag.description || "")}</div>
            </div>
            <button class="btn ${pinned ? "btn-primary" : "btn-secondary"} btn-compact" type="button" data-pin-tag="${escapeHtml(tag.id)}">
              ${pinned ? "Pinned" : "Pin"}
            </button>
          </div>
        `;
      })
      .join("");
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
      return `<a class="reddit-nav-item community-group-link ${active}" href="/community/g/${escapeHtml(g.slug)}" data-group="${escapeHtml(g.slug)}"><span class="reddit-nav-avatar" aria-hidden="true">${escapeHtml(initial)}</span><span>${escapeHtml(g.slug)}</span></a>`;
    }).join("");
  }

  function postScore(post) {
    const created = new Date(post.createdAt || 0).getTime() || Date.now();
    const ageHours = Math.max(1, (Date.now() - created) / 3600000);
    const activity = Number((post.group && post.group.postCount) || 1);
    return activity / Math.pow(ageHours + 2, 1.2);
  }

  function sortedPosts(posts) {
    const list = Array.isArray(posts) ? posts.slice() : [];
    const sort = route.type === "popular" ? "hot" : currentSort || "new";
    if (sort === "top" || sort === "hot") list.sort((a, b) => postScore(b) - postScore(a));
    else list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
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
    if (rightRail) rightRail.hidden = route.type === "settings" || route.type === "submit" || route.type === "mod";
    const modsList = document.getElementById("mods-list");
    if (modsList) {
      const mods = (staff || []).filter((p) => p.role === "owner" || p.role === "admin");
      modsList.innerHTML = mods.length
        ? mods.map((p) => `<a class="reddit-mod-link" href="/u/${escapeHtml(p.username || "")}">${escapeHtml(p.username || "mod")}</a>`).join("")
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
    let m = path.match(/^\/community\/g\/([a-z0-9-]+)$/i);
    if (m) return { type: "group", slug: m[1].toLowerCase(), username: "" };
    m = path.match(/^\/(?:community\/)?u\/([a-z0-9_]+)$/i);
    if (m) return { type: "user", slug: "", username: m[1].toLowerCase() };
    return { type: "home", slug: "", username: "" };
  }

  function routeUrl(next) {
    if (next.type === "settings") return "/community/settings";
    if (next.type === "submit") return "/community/submit";
    if (next.type === "mod") return "/community/mod";
    if (next.type === "popular") return "/community/popular";
    if (next.type === "group" && next.slug) return `/community/g/${encodeURIComponent(next.slug)}`;
    if (next.type === "user" && next.username) return `/u/${encodeURIComponent(next.username)}`;
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
      if (activePersona === publicUsername) {
        myTags = me.tags || [];
      } else {
        const alt = (alts || []).find((item) => item.username === activePersona);
        myTags = (alt && alt.tags) || [];
      }
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
    const parts = ['<a href="/community">community</a>'];
    if (route.type === "settings") {
      parts.push(`<span>/</span><span>settings</span>`);
    } else if (route.type === "submit") {
      parts.push(`<span>/</span><span>submit</span>`);
    } else if (route.type === "mod") {
      parts.push(`<span>/</span><span>mod</span>`);
    } else if (route.type === "popular") {
      parts.push(`<span>/</span><span>popular</span>`);
    } else if (route.type === "group" && route.slug) {
      parts.push(`<span>/</span><span>${escapeHtml(route.slug)}</span>`);
    } else if (route.type === "user" && route.username) {
      parts.push(`<span>/</span><span>${escapeHtml(route.username)}</span>`);
    }
    crumbsEl.innerHTML = parts.join(" ");
  }

  function renderGroups() {
    groupList.innerHTML = groups
      .map((group) => {
        const count = group.postCount != null ? `${group.postCount}` : "";
        const active = route.type === "group" && route.slug === group.slug ? "is-active" : "";
        const initial = String(group.slug || "?").slice(0, 1).toUpperCase();
        return `
          <a class="reddit-nav-item community-group-link ${active}" href="/community/g/${escapeHtml(group.slug)}" data-group="${escapeHtml(group.slug)}">
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
              <a class="community-user-link" href="/u/${escapeHtml(person.username || "")}">@${escapeHtml(person.username || "member")}</a>
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
              <a class="community-user-link" href="/u/${escapeHtml(alt.username)}">@${escapeHtml(alt.username)}</a>
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
    const ordered = sortedPosts(lastPosts);
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
        return `
          <article class="reddit-post">
            <div class="reddit-vote" aria-hidden="true">
              <button class="reddit-vote-btn up" type="button" tabindex="-1" disabled>▲</button>
              <span class="reddit-vote-count">${Math.max(1, Math.round(postScore(post) * 10))}</span>
              <button class="reddit-vote-btn down" type="button" tabindex="-1" disabled>▼</button>
            </div>
            <div class="reddit-post-main">
              <div class="reddit-post-meta">
                ${
                  showGroup
                    ? `<a class="reddit-sub" href="/community/g/${escapeHtml(group.slug)}">${escapeHtml(group.slug)}</a><span class="muted">•</span>`
                    : ""
                }
                <span class="muted">Posted by</span>
                <a class="community-user-link" href="/u/${escapeHtml(username)}">${escapeHtml(username)}</a>
                ${tagChip(author.pinnedTag, { compact: true })}
                <span class="muted">• ${escapeHtml(formatRelative(post.createdAt))}</span>
              </div>
              <div class="reddit-post-title">${escapeHtml(post.body || "")}</div>
              <div class="reddit-post-actions">
                <span class="reddit-action">💬 Comment</span>
                <span class="reddit-action">↗ Share</span>
                <span class="reddit-action">☆ Save</span>
              </div>
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
    const onFeed = !onSettings && !onSubmit && !onMod;
    if (feedView) feedView.hidden = needsUsername || !onFeed;
    if (settingsView) settingsView.hidden = needsUsername || !onSettings;
    if (submitView) submitView.hidden = needsUsername || !onSubmit;
    if (modView) modView.hidden = needsUsername || !onMod;
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
    if (publicUsername) {
      const gateInput = document.getElementById("public-username");
      if (gateInput) gateInput.value = publicUsername;
      if (settingsUsername) settingsUsername.value = publicUsername;
      if (myProfileLink) {
        myProfileLink.hidden = false;
        myProfileLink.href = `/u/${encodeURIComponent(publicUsername)}`;
      }
      if (myProfileLabel) myProfileLabel.textContent = publicUsername;
    } else if (myProfileLink) {
      myProfileLink.hidden = true;
    }
    const settingsLink = document.getElementById("settings-link");
    if (settingsLink) settingsLink.classList.toggle("is-active", onSettings);
    if (homeLink) homeLink.classList.toggle("is-active", route.type === "home");
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
    profileMeta.hidden = true;
    profileMeta.innerHTML = "";
    syncSortTabs();
    const createTop = document.getElementById("create-top-link");
    const bannerCreate = document.getElementById("banner-create-link");
    const submitHref =
      route.type === "group" && route.slug
        ? `/community/submit?group=${encodeURIComponent(route.slug)}`
        : "/community/submit";
    if (createTop) createTop.href = submitHref;
    if (bannerCreate) bannerCreate.href = submitHref;

    if (route.type === "settings" || route.type === "submit" || route.type === "mod") {
      updateAboutRail(data);
      return;
    }
    if (route.type === "user") {
      const profile = data.profile || { username: route.username };
      const viewIcon = document.getElementById("view-icon");
      if (viewIcon) viewIcon.textContent = "u";
      document.getElementById("view-eyebrow").textContent = "Profile";
      document.getElementById("view-title").textContent = `${profile.username || route.username}`;
      document.getElementById("view-blurb").textContent = "Member profile";
      document.getElementById("feed-label").textContent = "Posts";
      document.getElementById("feed-title").textContent = `Posts by ${profile.username || route.username}`;
      profileMeta.hidden = false;
      profileMeta.innerHTML = `
        <div class="community-profile-card">
          <div class="community-avatar" aria-hidden="true">${escapeHtml((profile.username || "?").slice(0, 1).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(profile.username || "")}</strong>
            ${tagChip(profile.pinnedTag, { compact: true })}
            
            
            <p class="muted" style="margin:4px 0 0;font-size:0.85rem;">
              ${Number(profile.postCount || 0)} posts
              ${profile.joinedAt ? ` · joined ${escapeHtml(formatWhen(profile.joinedAt))}` : ""}
            </p>
            <div class="community-tag-list" style="margin-top:10px;">
              ${
                (profile.tags || []).length
                  ? (profile.tags || [])
                      .map((tag) => {
                        const canPin =
                          me &&
                          (me.publicUsername === profile.username ||
                            activePersona === profile.username ||
                            ((me.alts || []).some((alt) => alt.username === profile.username) &&
                              me.isOwner));
                        return `
                          <div class="community-tag-row">
                            <div>
                              ${tagChip(tag)}
                              <div class="muted" style="font-size:0.78rem;margin-top:4px;">${escapeHtml(tag.description || "")}</div>
                            </div>
                            ${
                              canPin
                                ? `<button class="btn ${tag.pinned ? "btn-primary" : "btn-secondary"} btn-compact" type="button" data-pin-tag="${escapeHtml(tag.id)}">${tag.pinned ? "Pinned" : "Pin"}</button>`
                                : ""
                            }
                          </div>
                        `;
                      })
                      .join("")
                  : '<p class="muted" style="margin:0;font-size:0.85rem;">No tags yet.</p>'
              }
            </div>
          </div>
        </div>
      `;
      composerCard.hidden = true;
      return;
    }
    if (route.type === "group") {
      const group = data.group || groups.find((g) => g.slug === route.slug) || null;
      if (group) pushRecent(group);
      const viewIcon = document.getElementById("view-icon");
      if (viewIcon) viewIcon.textContent = (group && group.slug ? group.slug : "g").slice(0, 1).toUpperCase();
      document.getElementById("view-eyebrow").textContent = group ? group.slug : "Group";
      document.getElementById("view-title").textContent = group ? group.slug : route.slug;
      document.getElementById("view-blurb").textContent =
        (group && group.description) || "Posts in this community.";
      document.getElementById("feed-label").textContent = "Feed";
      document.getElementById("feed-title").textContent = group
        ? `Posts in ${group.slug}`
        : "Group posts";
      return;
    }
    if (route.type === "popular") {
      const viewIconPop = document.getElementById("view-icon");
      if (viewIconPop) viewIconPop.textContent = "▲";
      document.getElementById("view-eyebrow").textContent = "Popular";
      document.getElementById("view-title").textContent = "Popular";
      document.getElementById("view-blurb").textContent = "Trending posts from across Synk communities.";
      document.getElementById("feed-label").textContent = "Popular";
      document.getElementById("feed-title").textContent = "Trending posts";
      return;
    }
    const viewIcon = document.getElementById("view-icon");
    if (viewIcon) viewIcon.textContent = "⌂";
    document.getElementById("view-eyebrow").textContent = "Home feed";
    document.getElementById("view-title").textContent = "Home";
    document.getElementById("view-blurb").textContent = "Posts from every group, newest first.";
    document.getElementById("feed-label").textContent = "Feed";
    document.getElementById("feed-title").textContent = "Recent posts";
  }

  async function loadCommunity() {
    let url = "/api/synk-community";
    if (route.type === "group" && route.slug) {
      url += `?group=${encodeURIComponent(route.slug)}`;
    } else if (route.type === "user" && route.username) {
      url += `?user=${encodeURIComponent(route.username)}`;
    }
    const res = await fetch(url, { headers: hubHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load community");
    me = data.me || null;
    publicUsername = (me && me.publicUsername) || "";
    alts = (me && me.alts) || [];
    myTags = (me && me.tags) || [];
    tags = data.tags || [];
    groups = data.groups || [];
    staff = data.staff || [];
    ownerUsername = data.ownerUsername || "vision";
    applyUsernameState();
    applyStaffState();
    renderGroups();
    renderMyTags();
    applyViewState(data);
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
    const groupLink = e.target.closest('a[href^="/community/g/"]');
    const userLink = e.target.closest('a[href^="/u/"]');
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

  crumbsEl.addEventListener("click", (e) => {
    const home = e.target.closest('a[href="/community"]');
    if (!home) return;
    e.preventDefault();
    navigate({ type: "home", slug: "", username: "" }).catch(() => {});
  });

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
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "post",
          group: postGroup.value || route.slug || "general",
          body: document.getElementById("post-body").value,
          asUsername: activePersona || publicUsername,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not post");
      document.getElementById("post-body").value = "";
      status.textContent = "Posted";
      if (data.post && data.post.group && data.post.group.slug) {
        await navigate({ type: "group", slug: data.post.group.slug, username: "" }, { replace: true });
      } else {
        await loadCommunity();
      }
    } catch (err) {
      status.textContent = err.message || "Could not post";
    }
  });

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
      status.textContent = `Created @${data.alt.username}`;
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
      status.textContent = `Tagged @${data.username}`;
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

  async function handlePinClick(e) {
    const btn = e.target.closest("[data-pin-tag]");
    if (!btn) return;
    const tagId = btn.getAttribute("data-pin-tag");
    const status = document.getElementById("my-tags-status");
    if (status) status.textContent = "Updating…";
    try {
      const currentlyPinned = myTags.find((tag) => tag.id === tagId && tag.pinned);
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
      renderMyTags();
      await loadCommunity();
      if (status) status.textContent = data.pinnedTag ? `Pinned ${data.pinnedTag.name}` : "Pin cleared";
    } catch (err) {
      if (status) status.textContent = err.message || "Could not update pin";
    }
  }

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
  bindNav(document.getElementById("banner-create-link"), { type: "submit", slug: "", username: "" });
  bindNav(document.getElementById("mod-nav-link"), { type: "mod", slug: "", username: "" });
  bindNav(document.getElementById("mod-menu-link"), { type: "mod", slug: "", username: "" });

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

  try { currentSort = localStorage.getItem(SORT_KEY) || "new"; } catch (_) { currentSort = "new"; }
  renderRecent();

  const session = readSession();
  hubToken = (session && session.hubSession && session.hubSession.token) || "";
  route = parseRoute();
  history.replaceState(route, "", routeUrl(route));
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
