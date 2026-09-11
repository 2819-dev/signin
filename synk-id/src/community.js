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

  let hubToken = "";
  let publicUsername = "";
  let activePersona = "";
  let me = null;
  let groups = [];
  let staff = [];
  let alts = [];
  let ownerUsername = "vision";
  let route = { type: "home", slug: "", username: "" };

  function readSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.profile) return null;
      if (data.expiresAt && Date.now() > Number(data.expiresAt)) {
        localStorage.removeItem(STORAGE_KEY);
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

  function roleBadge(role) {
    if (role === "owner") return '<span class="community-badge community-badge-owner">Owner</span>';
    if (role === "admin") return '<span class="community-badge community-badge-admin">Admin</span>';
    return "";
  }

  function parseRoute() {
    const path = (location.pathname || "/community").replace(/\/+$/, "") || "/community";
    let m = path.match(/^\/community\/g\/([a-z0-9-]+)$/i);
    if (m) return { type: "group", slug: m[1].toLowerCase(), username: "" };
    m = path.match(/^\/(?:community\/)?u\/([a-z0-9_]+)$/i);
    if (m) return { type: "user", slug: "", username: m[1].toLowerCase() };
    return { type: "home", slug: "", username: "" };
  }

  function routeUrl(next) {
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
    if (route.type === "group" && route.slug) {
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
      .map((group) => `<option value="${escapeHtml(group.slug)}">${escapeHtml(group.name)}</option>`)
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
    const title = document.getElementById("username-title");
    const help = document.getElementById("username-help");
    const btn = document.getElementById("username-btn");
    communityMain.hidden = !publicUsername;
    composerCard.hidden = !publicUsername || route.type === "user";
    if (publicUsername) {
      title.textContent = "Your public username";
      help.textContent = "You can change this anytime.";
      btn.textContent = "Update username";
      document.getElementById("public-username").value = publicUsername;
    } else {
      title.textContent = "Choose how you appear";
      help.textContent =
        "This is separate from your legal Synk name. Letters, numbers, and underscores only.";
      btn.textContent = "Save username";
    }
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
    syncPersonaUi();
  }

  function applyViewState(data) {
    renderCrumbs();
    profileMeta.hidden = true;
    profileMeta.innerHTML = "";
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
            ${roleBadge(profile.role)}
            ${profile.isAlt ? '<span class="community-badge">Alt</span>' : ""}
            <p class="muted" style="margin:4px 0 0;font-size:0.85rem;">
              ${Number(profile.postCount || 0)} posts
              ${profile.joinedAt ? ` · joined ${escapeHtml(formatWhen(profile.joinedAt))}` : ""}
            </p>
          </div>
        </div>
      `;
      composerCard.hidden = true;
      return;
    }
    if (route.type === "group") {
      const group = data.group || groups.find((g) => g.slug === route.slug) || null;
      document.getElementById("view-eyebrow").textContent = group ? `g/${group.slug}` : "Group";
      document.getElementById("view-title").textContent = group ? group.name : route.slug;
      document.getElementById("view-blurb").textContent =
        (group && group.description) || "Posts in this community.";
      document.getElementById("feed-label").textContent = "Feed";
      document.getElementById("feed-title").textContent = group
        ? `Posts in g/${group.slug}`
        : "Group posts";
      return;
    }
    document.getElementById("view-eyebrow").textContent = "Home feed";
    document.getElementById("view-title").textContent = "All groups";
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
    groups = data.groups || [];
    staff = data.staff || [];
    ownerUsername = data.ownerUsername || "vision";
    applyUsernameState();
    applyStaffState();
    renderGroups();
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

  document.getElementById("username-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("username-status");
    status.textContent = "Saving…";
    try {
      const res = await fetch("/api/synk-community", {
        method: "POST",
        headers: hubHeaders(),
        body: JSON.stringify({
          action: "set-username",
          username: document.getElementById("public-username").value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save username");
      publicUsername = data.publicUsername;
      storePersona(publicUsername);
      status.textContent = "Saved";
      await loadCommunity();
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
          slug: document.getElementById("group-slug").value,
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

  document.getElementById("signout-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
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
