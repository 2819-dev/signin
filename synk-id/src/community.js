(() => {
  const STORAGE_KEY = "synk_member_session";
  const PERSONA_KEY = "synk_community_persona";

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
  const tagCatalog = document.getElementById("tag-catalog");
  const assignTagSelect = document.getElementById("assign-tag-id");
  const myTagsCard = document.getElementById("my-tags-card");
  const myTagsList = document.getElementById("my-tags-list");

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
      if (data.expiresAt && Date.now() > Number(data.expiresAt)) {
        store.removeItem(STORAGE_KEY);
        return null;
      }
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

  function roleBadge(role) {
    if (role === "owner") return '<span class="community-badge community-badge-owner">Owner</span>';
    if (role === "admin") return '<span class="community-badge community-badge-admin">Admin</span>';
    return "";
  }

  function parseRoute() {
    const path = (location.pathname || "/community").replace(/\/+$/, "") || "/community";
    if (path === "/community/settings") return { type: "settings", slug: "", username: "" };
    let m = path.match(/^\/community\/g\/([a-z0-9-]+)$/i);
    if (m) return { type: "group", slug: m[1].toLowerCase(), username: "" };
    m = path.match(/^\/(?:community\/)?u\/([a-z0-9_]+)$/i);
    if (m) return { type: "user", slug: "", username: m[1].toLowerCase() };
    return { type: "home", slug: "", username: "" };
  }

  function routeUrl(next) {
    if (next.type === "settings") return "/community/settings";
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
      return String(sessionStorage.getItem(PERSONA_KEY) || "").trim().toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function storePersona(username) {
    activePersona = String(username || "").trim().toLowerCase();
    try {
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

  function syncPersonaUi() {
    const isOwner = !!(me && me.isOwner);
    personaSwitch.hidden = !(isOwner && publicUsername);
    if (!isOwner) {
      personaMenu.hidden = true;
      personaBtn.setAttribute("aria-expanded", "false");
      return;
    }
    resolveActivePersona();
    personaLabel.textContent = activePersona ? `@${activePersona}` : "@—";
    document.getElementById("composer-as").textContent = activePersona
      ? `Posting as @${activePersona}`
      : "Posting as —";
    personaMenu.innerHTML = personaOptions()
      .map((opt) => {
        const selected = opt.username === activePersona ? "is-selected" : "";
        return `
          <button class="persona-menu-item ${selected}" type="button" role="option" data-persona="${escapeHtml(opt.username)}">
            <strong>@${escapeHtml(opt.username)}</strong>
            <span>${escapeHtml(opt.label)}${opt.isAlt ? " · alt" : ""}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderCrumbs() {
    const parts = ['<a href="/community">community</a>'];
    if (route.type === "settings") {
      parts.push(`<span>/</span><span>settings</span>`);
    } else if (route.type === "group" && route.slug) {
      parts.push(`<span>/</span><span>g/${escapeHtml(route.slug)}</span>`);
    } else if (route.type === "user" && route.username) {
      parts.push(`<span>/</span><span>u/${escapeHtml(route.username)}</span>`);
    }
    crumbsEl.innerHTML = parts.join(" ");
  }

  function renderGroups() {
    groupList.innerHTML = groups
      .map((group) => {
        const count = group.postCount != null ? `${group.postCount} posts` : "";
        const active = route.type === "group" && route.slug === group.slug ? "is-active" : "";
        return `
          <a class="community-group-link ${active}" href="/community/g/${escapeHtml(group.slug)}" data-group="${escapeHtml(group.slug)}">
            <strong>g/${escapeHtml(group.slug)}</strong>
            <span>${escapeHtml(group.name)}${count ? ` · ${escapeHtml(count)}` : ""}</span>
          </a>
        `;
      })
      .join("");
    homeLink.classList.toggle("is-active", route.type === "home");
    postGroup.innerHTML = groups
      .map((group) => `<option value="${escapeHtml(group.slug)}">g/${escapeHtml(group.slug)} — ${escapeHtml(group.name)}</option>`)
      .join("");
    if (route.type === "group" && route.slug) postGroup.value = route.slug;
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
              ${roleBadge(person.role)}
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
    if (!posts || !posts.length) {
      feedEl.innerHTML = "";
      feedEmpty.hidden = false;
      return;
    }
    feedEmpty.hidden = true;
    feedEl.innerHTML = posts
      .map((post) => {
        const group = post.group;
        const author = post.author || {};
        const username = author.username || "member";
        return `
          <article class="community-post">
            <div class="community-post-rail" aria-hidden="true"></div>
            <div class="community-post-body">
              <div class="community-post-meta">
                ${
                  group
                    ? `<a class="community-group-chip" href="/community/g/${escapeHtml(group.slug)}">g/${escapeHtml(group.slug)}</a>`
                    : ""
                }
                <span class="muted">Posted by</span>
                <a class="community-user-link" href="/u/${escapeHtml(username)}">u/${escapeHtml(username)}</a>
                ${tagChip(author.pinnedTag, { compact: true })}
                ${roleBadge(author.role)}
                ${author.isAlt ? '<span class="community-badge">Alt</span>' : ""}
                <span class="muted">· ${escapeHtml(formatWhen(post.createdAt))}</span>
              </div>
              <p>${escapeHtml(post.body || "")}</p>
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
    if (feedView) feedView.hidden = needsUsername || onSettings;
    if (settingsView) settingsView.hidden = needsUsername || !onSettings;
    if (composerCard) {
      composerCard.hidden = needsUsername || onSettings || route.type === "user";
    }
    if (publicUsername) {
      const gateInput = document.getElementById("public-username");
      if (gateInput) gateInput.value = publicUsername;
      if (settingsUsername) settingsUsername.value = publicUsername;
      if (myProfileLink) {
        myProfileLink.hidden = false;
        myProfileLink.href = `/u/${encodeURIComponent(publicUsername)}`;
      }
      if (myProfileLabel) myProfileLabel.textContent = `u/${publicUsername}`;
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
    ownerTools.hidden = !isOwner;
    document.getElementById("owner-label").textContent = `@${ownerUsername}`;
    renderStaff();
    renderAlts();
    renderTagCatalog();
    syncPersonaUi();
  }

  function applyViewState(data) {
    renderCrumbs();
    profileMeta.hidden = true;
    profileMeta.innerHTML = "";
    if (route.type === "settings") {
      return;
    }
    if (route.type === "user") {
      const profile = data.profile || { username: route.username };
      document.getElementById("view-eyebrow").textContent = "Profile";
      document.getElementById("view-title").textContent = `u/${profile.username || route.username}`;
      document.getElementById("view-blurb").textContent = profile.isAlt
        ? "Alt account profile"
        : "Member profile";
      document.getElementById("feed-label").textContent = "Posts";
      document.getElementById("feed-title").textContent = `Posts by u/${profile.username || route.username}`;
      profileMeta.hidden = false;
      profileMeta.innerHTML = `
        <div class="community-profile-card">
          <div class="community-avatar" aria-hidden="true">${escapeHtml((profile.username || "?").slice(0, 1).toUpperCase())}</div>
          <div>
            <strong>u/${escapeHtml(profile.username || "")}</strong>
            ${tagChip(profile.pinnedTag, { compact: true })}
            ${roleBadge(profile.role)}
            ${profile.isAlt ? '<span class="community-badge">Alt</span>' : ""}
            <p class="muted" style="margin:4px 0 0;font-size:0.85rem;">
              ${Number(profile.postCount || 0)} posts
              ${profile.joinedAt ? ` · joined ${escapeHtml(formatWhen(profile.joinedAt))}` : ""}
            </p>
            <div class="community-tag-list" style="margin-top:10px;">
              ${
                (profile.tags || []).length
                  ? (profile.tags || [])
                      .map((tag) => {
                        const canPin = me && me.publicUsername === profile.username;
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
      document.getElementById("view-eyebrow").textContent = group ? `g/${group.slug}` : "Group";
      document.getElementById("view-title").textContent = group ? `g/${group.slug}` : `g/${route.slug}`;
      document.getElementById("view-blurb").textContent =
        (group && group.description) || "Posts in this community.";
      document.getElementById("feed-label").textContent = "Feed";
      document.getElementById("feed-title").textContent = group
        ? `Posts in g/${group.slug}`
        : "Group posts";
      return;
    }
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

  function closePersonaMenu() {
    personaMenu.hidden = true;
    personaBtn.setAttribute("aria-expanded", "false");
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
      status.textContent = `Created g/${data.group.slug}`;
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
            ? { action: "pin-tag", clear: true }
            : { action: "pin-tag", tagId }
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
        me.tags = myTags;
        me.pinnedTag = data.pinnedTag || null;
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

  document.getElementById("signout-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    try {
      sessionStorage.removeItem(PERSONA_KEY);
    } catch (_) {}
    location.href = "/verify";
  });

  const session = readSession();
  hubToken = (session && session.hubSession && session.hubSession.token) || "";
  route = parseRoute();
  history.replaceState(route, "", routeUrl(route));
  if (!session || !hubToken) {
    lockedCard.hidden = false;
  } else {
    communityApp.hidden = false;
    loadCommunity().catch((err) => {
      communityApp.hidden = true;
      lockedCard.hidden = false;
      document.getElementById("locked-help").textContent =
        err.message || "Session expired. Log in again.";
    });
  }
})();
