"use strict";

const { randomUUID } = require("crypto");
const { signedPhotoUrl } = require("./lib/synk-admin-auth");
const { getStore, connectLambda } = require("@netlify/blobs");
const { getSql, json } = require("./lib/db");
const {
  ensureSynkCoreTables,
  requireHubSession,
  normalizePublicUsername,
  normalizeGroupSlug,
  normalizeGroupName,
  normalizeGroupDescription,
  COMMUNITY_OWNER_USERNAME,
  ensureCommunityOwner,
  getCommunityStaffRole,
  isCommunityStaffRole,
  listCommunityStaff,
  listCommunityGroups,
  findCommunityGroup,
  hydrateCommunityGroup,
  findGroupChannel,
  listGroupRoles,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  ensureOfficialSynkGroup,
  formatChannelLabel,
  normalizeChannelKind,
  normalizeSuggestionStatus,
  capitalizeChannelName,
  isCommunityUsernameTaken,
  listOwnerAltAccounts,
  findCommunityAltAccount,
  findCommunityPublicProfile,
  normalizeTagName,
  normalizeTagSlug,
  normalizeTagDescription,
  normalizeTagColor,
  listCommunityTags,
  findCommunityTag,
  listInfoPages,
  findInfoPage,
  normalizePageSlug,
  normalizePageTitle,
  normalizePageBlocks,
  mapInfoPage,
  isBetaTesterTag,
  listProfileTags,
  listUsernameTags,
  getPinnedTagForProfile,
  getPinnedTagForUsername,
  getPinnedTagsByUsernames,
  getDisplayNamesByUsernames,
  setDisplayNameForUsername,
  setBioForUsername,
  setDmPolicyForUsername,
  getFriendship,
  requestFriendship,
  respondFriendship,
  removeFriendship,
  canDm,
  getOrCreateDmThread,
  listDmThreads,
  listFriends,
  getDmThreadById,
  listDmMessages,
  sendDm,
  editDmMessage,
  deleteDmMessage,
  reactDmMessage,
  friendshipViewerStatus,
  getAvatarsByUsernames,
  setAvatarForUsername,
  updateSynkProfilePhoto,
  normalizeDisplayName,
  normalizeBio,
  normalizeDmPolicy,
  assignUsernameTag,
  unassignUsernameTag,
  setPinnedTagForUsername,
  findCommunityProfileIdByUsername,
  logSynkEvent,
  clientIp,
  buildReleaseNotesPayload,
  getAppUpdateReleaseNotes,
} = require("./lib/synk");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_DATA_CHARS = 750000;
const POST_TYPES = new Set(["text", "link", "image", "poll"]);

function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
}

function normalizePostBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 10000);
}

function normalizeTitle(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

function normalizePostType(value) {
  const type = String(value || "text")
    .trim()
    .toLowerCase();
  return POST_TYPES.has(type) ? type : null;
}

function normalizeLinkUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

function normalizeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(raw)) {
    if (raw.length > MAX_IMAGE_DATA_CHARS) return null;
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

function normalizePollOptions(value) {
  let items = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    items = value.split(/\r?\n|,/).map((part) => part.trim());
  } else {
    return null;
  }
  const cleaned = [];
  const seen = new Set();
  for (const item of items) {
    const option = String(item || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120);
    if (!option) continue;
    const key = option.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(option);
  }
  if (cleaned.length < 2 || cleaned.length > 6) return null;
  return cleaned;
}

function normalizeAltLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function parsePollOptions(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.map((item) => String(item));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function derivePostTitle(row) {
  const titled = normalizeTitle(row && row.title);
  if (titled) return titled;
  const body = String((row && row.body) || "")
    .replace(/\r\n/g, "\n")
    .trim();
  const firstLine = (body.split("\n")[0] || "").trim();
  return firstLine.slice(0, 180) || "Post";
}

function mapPost(row) {
  const username =
    String(row.author_username || "").trim() || row.public_username || "member";
  const primaryUsername = row.public_username || "";
  const isPrimary = !primaryUsername || username === primaryUsername;
  const pollOptions = parsePollOptions(row.poll_options);
  const channelKind = normalizeChannelKind(row.channel_kind, row.channel_slug);
  const suggestionStatus = normalizeSuggestionStatus(row.suggestion_status);
  return {
    id: row.id,
    title: derivePostTitle(row),
    type: String(row.post_type || "text").toLowerCase() || "text",
    body: row.body == null ? "" : row.body,
    linkUrl: row.link_url || null,
    imageUrl: row.image_url || null,
    pollOptions,
    pollCounts: Array.isArray(row.poll_counts)
      ? row.poll_counts.map((n) => Number(n) || 0)
      : pollOptions
        ? pollOptions.map(() => 0)
        : null,
    myPollVote:
      row.my_poll_vote == null || row.my_poll_vote === ""
        ? null
        : Number(row.my_poll_vote),
    score: Number(row.score) || 0,
    commentCount: Number(row.comment_count) || 0,
    myVote: row.my_vote == null || row.my_vote === "" ? 0 : Number(row.my_vote) || 0,
    saved: Boolean(row.saved),
    hidden: Boolean(row.hidden),
    suggestionStatus: suggestionStatus || (channelKind === "suggestions" ? "open" : ""),
    createdAt: row.created_at,
    group: row.group_slug
      ? {
          id: row.group_id,
          slug: row.group_slug,
          name: row.group_name || row.group_slug,
          theme:
            row.group_is_official === true || row.group_slug === "synk"
              ? "discord"
              : "standard",
          isOfficial: row.group_is_official === true,
        }
      : null,
    channel: row.channel_id
      ? {
          id: row.channel_id,
          slug: row.channel_slug || "",
          name: capitalizeChannelName(row.channel_name || row.channel_slug || ""),
          emoji: row.channel_emoji || "",
          kind: channelKind,
          label:
            row.channel_emoji && row.channel_name
              ? `${row.channel_emoji} | ${capitalizeChannelName(row.channel_name)}`
              : capitalizeChannelName(row.channel_name || row.channel_slug || ""),
        }
      : null,
    author: {
      username,
      displayName: "",
      avatarUrl: "",
      role: isPrimary ? row.author_role || null : null,
      isAlt: Boolean(row.is_alt) || (!isPrimary && Boolean(username)),
    },
  };
}

function mapComment(row) {
  const username =
    String(row.author_username || "").trim() || row.public_username || "member";
  const primaryUsername = row.public_username || "";
  const isPrimary = !primaryUsername || username === primaryUsername;
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id || null,
    body: row.body,
    score: Number(row.score) || 0,
    myVote: row.my_vote == null || row.my_vote === "" ? 0 : Number(row.my_vote) || 0,
    createdAt: row.created_at,
    author: {
      username,
      displayName: "",
      avatarUrl: "",
      role: isPrimary ? row.author_role || null : null,
      isAlt: Boolean(row.is_alt) || (!isPrimary && Boolean(username)),
      pinnedTag: null,
    },
  };
}

function notificationCopy({ kind, actorUsername, body }) {
  const actor = String(actorUsername || "").trim() || "Someone";
  const k = String(kind || "").trim().toLowerCase().replace(/-/g, "_");
  if (k === "friend_request") {
    return {
      title: "Friend request",
      description: `${actor} sent you a friend request.`,
    };
  }
  if (k === "friend_accept" || k === "friend_accepted") {
    return {
      title: "Friend request accepted",
      description: `${actor} accepted your friend request.`,
    };
  }
  if (k === "comment") {
    return {
      title: "New comment",
      description: body && String(body).trim() ? String(body).trim() : `${actor} commented on your post.`,
    };
  }
  if (k === "comment_reply_on_post" || k === "comment_reply_on_post") {
    return {
      title: "Reply on your post",
      description: body && String(body).trim() ? String(body).trim() : `${actor} replied to a comment on your post.`,
    };
  }
  if (k === "reply") {
    return {
      title: "New reply",
      description: body && String(body).trim() ? String(body).trim() : `${actor} replied to your comment.`,
    };
  }
  if (k === "dm" || k === "message") {
    return {
      title: "New message",
      description: body && String(body).trim() ? String(body).trim() : `${actor} sent you a message.`,
    };
  }
  if (k === "app_update" || k === "app_updated" || k === "update") {
    return {
      title: "App updated",
      description:
        body && String(body).trim()
          ? String(body).trim()
          : "Synk was updated. Refresh or reopen to get the latest.",
    };
  }
  return {
    title: "Notification",
    description: body && String(body).trim() ? String(body).trim() : `${actor} sent you a notification.`,
  };
}

function parseNotificationMeta(body) {
  const raw = String(body || "");
  const match = raw.match(/<!--\s*synk-version:([^>]+?)\s*-->/i);
  const version = match ? String(match[1] || "").trim() : "";
  const text = raw.replace(/<!--\s*synk-version:[^>]*-->/gi, "").trim();
  return { text, version };
}

function mapNotification(row) {
  const kind = row.kind;
  const actorUsername = row.actor_username || null;
  const meta = parseNotificationMeta(row.body || "");
  const copy = notificationCopy({ kind, actorUsername, body: meta.text });
  return {
    id: row.id,
    kind,
    actorUsername,
    postId: row.post_id || null,
    commentId: row.comment_id || null,
    body: copy.description,
    title: copy.title,
    description: copy.description,
    version: meta.version || null,
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

function mePayload(auth, role, alts = [], tags = [], pinnedTag = null) {
  const tagList = tags || [];
  const altList = alts || [];
  const betaTester =
    tagList.some(isBetaTesterTag) ||
    altList.some((alt) => (alt.tags || []).some(isBetaTesterTag));
  return {
    profileId: auth.profile.id,
    name: auth.profile.name,
    synkCode: auth.profile.synkCode,
    publicUsername: auth.profile.publicUsername || "",
    displayName: auth.profile.displayName || "",
    photoUrl: signedPhotoUrl(auth.profile.photoUrl || ""),
    avatarUrl: auth.profile.avatarUrl || "",
    bio: auth.profile.bio || "",
    dmPolicy: auth.profile.dmPolicy || "friends",
    role: role || null,
    isStaff: isCommunityStaffRole(role),
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
    betaTester,
    alts: role === "owner" ? altList : [],
    tags: tagList,
    pinnedTag: pinnedTag || null,
  };
}

async function getUnreadCount(sql, profileId) {
  if (!profileId) return 0;
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM synk_community_notifications
    WHERE synk_profile_id = ${profileId}
      AND read_at IS NULL
  `;
  return Number(rows[0] && rows[0].count) || 0;
}

async function listJoinedGroupIdSet(sql, profileId) {
  if (!profileId) return new Set();
  const rows = await sql`
    SELECT group_id
    FROM synk_community_memberships
    WHERE synk_profile_id = ${profileId}
  `;
  return new Set(rows.map((row) => String(row.group_id)));
}

async function markGroupsJoined(sql, groups, profileId) {
  const joined = await listJoinedGroupIdSet(sql, profileId);
  return (groups || []).map((group) => ({
    ...group,
    joined: joined.has(String(group.id)),
  }));
}

async function loadNotifications(sql, profileId, { limit = 50, username = "" } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const rows = await sql`
    SELECT
      id,
      kind,
      actor_username,
      post_id,
      comment_id,
      body,
      read_at,
      created_at
    FROM synk_community_notifications
    WHERE synk_profile_id = ${profileId}
    ORDER BY created_at DESC
    LIMIT ${capped}
  `;
  const notes = rows.map(mapNotification);

  // Surface pending friend requests even if a row was missed.
  const meName = normalizePublicUsername(username);
  if (meName) {
    try {
      const pending = await sql`
        SELECT id, requester_username, created_at
        FROM synk_community_friendships
        WHERE addressee_username = ${meName}
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const seen = new Set(
        notes
          .filter((n) => n.kind === "friend_request" && n.actorUsername)
          .map((n) => String(n.actorUsername).toLowerCase())
      );
      for (const row of pending) {
        const actor = String(row.requester_username || "").toLowerCase();
        if (!actor || seen.has(actor)) continue;
        const actorName = row.requester_username;
        const copy = notificationCopy({
          kind: "friend_request",
          actorUsername: actorName,
        });
        notes.unshift({
          id: `friend-req-${row.id}`,
          kind: "friend_request",
          actorUsername: actorName,
          postId: null,
          commentId: null,
          body: copy.description,
          title: copy.title,
          description: copy.description,
          readAt: null,
          createdAt: row.created_at,
        });
        seen.add(actor);
      }
    } catch (_) {}
  }

  notes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return notes.slice(0, capped);
}

async function createNotification(
  sql,
  { profileId, kind, actorUsername, postId = null, commentId = null, body = "" }
) {
  if (!profileId) return;
  await sql`
    INSERT INTO synk_community_notifications (
      synk_profile_id, kind, actor_username, post_id, comment_id, body
    )
    VALUES (
      ${profileId},
      ${kind},
      ${actorUsername || null},
      ${postId},
      ${commentId},
      ${String(body || "").slice(0, 500)}
    )
  `;
}

async function enrichPosts(sql, rows, profileId) {
  if (!rows || !rows.length) return [];
  const mapped = rows.map(mapPost);
  const postIds = mapped.map((post) => post.id).filter(Boolean);
  if (!postIds.length) return mapped;

  const pollPosts = mapped.filter(
    (post) => post.type === "poll" && Array.isArray(post.pollOptions) && post.pollOptions.length
  );

  let voteMap = {};
  let saveSet = new Set();
  let hideSet = new Set();
  let pollVoteMap = {};
  const pollCountMap = {};

  if (pollPosts.length) {
    const pollIds = pollPosts.map((post) => post.id);
    const counts = await sql`
      SELECT post_id, option_index, COUNT(*)::int AS count
      FROM synk_community_poll_votes
      WHERE post_id = ANY(${pollIds}::uuid[])
      GROUP BY post_id, option_index
    `;
    for (const row of counts) {
      const key = String(row.post_id);
      if (!pollCountMap[key]) pollCountMap[key] = {};
      pollCountMap[key][Number(row.option_index)] = Number(row.count) || 0;
    }
  }

  if (profileId) {
    const votes = await sql`
      SELECT target_id, value
      FROM synk_community_votes
      WHERE synk_profile_id = ${profileId}
        AND target_type = 'post'
        AND target_id = ANY(${postIds}::uuid[])
    `;
    for (const row of votes) {
      voteMap[String(row.target_id)] = Number(row.value) || 0;
    }

    const saves = await sql`
      SELECT post_id
      FROM synk_community_saves
      WHERE synk_profile_id = ${profileId}
        AND post_id = ANY(${postIds}::uuid[])
    `;
    saveSet = new Set(saves.map((row) => String(row.post_id)));

    const hides = await sql`
      SELECT post_id
      FROM synk_community_hides
      WHERE synk_profile_id = ${profileId}
        AND post_id = ANY(${postIds}::uuid[])
    `;
    hideSet = new Set(hides.map((row) => String(row.post_id)));

    if (pollPosts.length) {
      const pollIds = pollPosts.map((post) => post.id);
      const myPolls = await sql`
        SELECT post_id, option_index
        FROM synk_community_poll_votes
        WHERE synk_profile_id = ${profileId}
          AND post_id = ANY(${pollIds}::uuid[])
      `;
      for (const row of myPolls) {
        pollVoteMap[String(row.post_id)] = Number(row.option_index);
      }
    }
  }

  for (const post of mapped) {
    const id = String(post.id);
    post.myVote = voteMap[id] || 0;
    post.saved = saveSet.has(id);
    post.hidden = hideSet.has(id);
    if (Array.isArray(post.pollOptions) && post.pollOptions.length) {
      const counts = pollCountMap[id] || {};
      post.pollCounts = post.pollOptions.map((_, index) => counts[index] || 0);
      post.myPollVote =
        pollVoteMap[id] == null || Number.isNaN(pollVoteMap[id])
          ? null
          : pollVoteMap[id];
    }
  }

  return mapped;
}

async function attachPinnedTagsToAuthors(sql, items) {
  const usernames = items
    .map((item) => item.author && item.author.username)
    .filter(Boolean);
  const [pinnedByUser, displayByUser, avatarByUser] = await Promise.all([
    getPinnedTagsByUsernames(sql, usernames),
    getDisplayNamesByUsernames(sql, usernames),
    getAvatarsByUsernames(sql, usernames),
  ]);
  for (const item of items) {
    if (!item.author) continue;
    item.author.pinnedTag = pinnedByUser[item.author.username] || null;
    item.author.displayName = displayByUser[item.author.username] || item.author.displayName || "";
    item.author.avatarUrl = avatarByUser[item.author.username] || item.author.avatarUrl || "";
  }
  return items;
}

async function loadPosts(
  sql,
  {
    groupId = null,
    channelId = null,
    authorUsername = null,
    profileId = null,
    joinedOnly = false,
    savedOnly = false,
    excludeOfficial = false,
    sort = "new",
    limit = 80,
  } = {}
) {
  const capped = Math.min(Math.max(Number(limit) || 80, 1), 100);
  const author = normalizePublicUsername(authorUsername);
  const sortKey = String(sort || "new").toLowerCase();
  const byScore = sortKey === "hot" || sortKey === "top" || sortKey === "best";
  const useJoined = Boolean(joinedOnly && profileId);
  const useSaved = Boolean(savedOnly && profileId);
  const hideForViewer = Boolean(profileId);
  const hideOfficial = Boolean(excludeOfficial && !groupId);

  const rows = byScore
    ? await sql`
        SELECT
          p.id,
          p.title,
          p.post_type,
          p.body,
          p.link_url,
          p.image_url,
          p.poll_options,
          p.score,
          p.created_at,
          p.group_id,
          p.author_username,
          p.suggestion_status,
          m.name,
          c.public_username,
          g.slug AS group_slug,
          g.name AS group_name,
          g.theme AS group_theme,
          g.is_official AS group_is_official,
          p.channel_id,
          ch.slug AS channel_slug,
          ch.name AS channel_name,
          ch.emoji AS channel_emoji,
          ch.kind AS channel_kind,
          (
            SELECT COUNT(*)::int
            FROM synk_community_comments cc
            WHERE cc.post_id = p.id
          ) AS comment_count,
          CASE
            WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
            THEN s.role
            ELSE NULL
          END AS author_role,
          CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
        FROM synk_community_posts p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_groups g ON g.id = p.group_id
        LEFT JOIN synk_community_group_channels ch ON ch.id = p.channel_id
        LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_alt_accounts a
          ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
        WHERE (${groupId}::uuid IS NULL OR p.group_id = ${groupId})
          AND (${channelId}::uuid IS NULL OR p.channel_id = ${channelId})
          AND (
            ${author || null}::text IS NULL
            OR COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = ${author || null}
          )
          AND (
            ${useJoined ? 1 : 0} = 0
            OR EXISTS (
              SELECT 1
              FROM synk_community_memberships mem
              WHERE mem.synk_profile_id = ${profileId}
                AND mem.group_id = p.group_id
            )
          )
          AND (
            ${useSaved ? 1 : 0} = 0
            OR EXISTS (
              SELECT 1
              FROM synk_community_saves sv
              WHERE sv.synk_profile_id = ${profileId}
                AND sv.post_id = p.id
            )
          )
          AND (
            ${hideForViewer ? 1 : 0} = 0
            OR NOT EXISTS (
              SELECT 1
              FROM synk_community_hides hd
              WHERE hd.synk_profile_id = ${profileId}
                AND hd.post_id = p.id
            )
          )
          AND (
            ${hideOfficial ? 1 : 0} = 0
            OR COALESCE(g.is_official, FALSE) = FALSE
          )
        ORDER BY p.score DESC, p.created_at DESC
        LIMIT ${capped}
      `
    : await sql`
        SELECT
          p.id,
          p.title,
          p.post_type,
          p.body,
          p.link_url,
          p.image_url,
          p.poll_options,
          p.score,
          p.created_at,
          p.group_id,
          p.author_username,
          p.suggestion_status,
          m.name,
          c.public_username,
          g.slug AS group_slug,
          g.name AS group_name,
          g.theme AS group_theme,
          g.is_official AS group_is_official,
          p.channel_id,
          ch.slug AS channel_slug,
          ch.name AS channel_name,
          ch.emoji AS channel_emoji,
          ch.kind AS channel_kind,
          (
            SELECT COUNT(*)::int
            FROM synk_community_comments cc
            WHERE cc.post_id = p.id
          ) AS comment_count,
          CASE
            WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
            THEN s.role
            ELSE NULL
          END AS author_role,
          CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
        FROM synk_community_posts p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_groups g ON g.id = p.group_id
        LEFT JOIN synk_community_group_channels ch ON ch.id = p.channel_id
        LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_alt_accounts a
          ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
        WHERE (${groupId}::uuid IS NULL OR p.group_id = ${groupId})
          AND (${channelId}::uuid IS NULL OR p.channel_id = ${channelId})
          AND (
            ${author || null}::text IS NULL
            OR COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = ${author || null}
          )
          AND (
            ${useJoined ? 1 : 0} = 0
            OR EXISTS (
              SELECT 1
              FROM synk_community_memberships mem
              WHERE mem.synk_profile_id = ${profileId}
                AND mem.group_id = p.group_id
            )
          )
          AND (
            ${useSaved ? 1 : 0} = 0
            OR EXISTS (
              SELECT 1
              FROM synk_community_saves sv
              WHERE sv.synk_profile_id = ${profileId}
                AND sv.post_id = p.id
            )
          )
          AND (
            ${hideForViewer ? 1 : 0} = 0
            OR NOT EXISTS (
              SELECT 1
              FROM synk_community_hides hd
              WHERE hd.synk_profile_id = ${profileId}
                AND hd.post_id = p.id
            )
          )
          AND (
            ${hideOfficial ? 1 : 0} = 0
            OR COALESCE(g.is_official, FALSE) = FALSE
          )
        ORDER BY p.created_at DESC
        LIMIT ${capped}
      `;

  return enrichPosts(sql, rows, profileId);
}

async function loadPostById(sql, postId, profileId = null) {
  if (!isUuid(postId)) return null;
  const rows = await sql`
    SELECT
      p.id,
      p.title,
      p.post_type,
      p.body,
      p.link_url,
      p.image_url,
      p.poll_options,
      p.score,
      p.created_at,
      p.group_id,
      p.author_username,
      m.name,
      c.public_username,
      g.slug AS group_slug,
      g.name AS group_name,
      (
        SELECT COUNT(*)::int
        FROM synk_community_comments cc
        WHERE cc.post_id = p.id
      ) AS comment_count,
      CASE
        WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
        THEN s.role
        ELSE NULL
      END AS author_role,
      CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
    FROM synk_community_posts p
    JOIN synk_profiles m ON m.id = p.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_groups g ON g.id = p.group_id
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_alt_accounts a
      ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
    WHERE p.id = ${postId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const enriched = await enrichPosts(sql, rows, profileId);
  return enriched[0] || null;
}

async function loadComments(sql, postId, profileId = null) {
  if (!isUuid(postId)) return [];
  const rows = await sql`
    SELECT
      cm.id,
      cm.post_id,
      cm.parent_id,
      cm.body,
      cm.score,
      cm.created_at,
      cm.author_username,
      m.name,
      c.public_username,
      CASE
        WHEN COALESCE(NULLIF(btrim(cm.author_username), ''), c.public_username) = c.public_username
        THEN s.role
        ELSE NULL
      END AS author_role,
      CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
    FROM synk_community_comments cm
    JOIN synk_profiles m ON m.id = cm.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = cm.synk_profile_id
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = cm.synk_profile_id
    LEFT JOIN synk_community_alt_accounts a
      ON a.public_username = COALESCE(NULLIF(btrim(cm.author_username), ''), c.public_username)
    WHERE cm.post_id = ${postId}
    ORDER BY cm.created_at ASC
  `;
  const mapped = rows.map(mapComment);
  if (profileId && mapped.length) {
    const ids = mapped.map((item) => item.id);
    const votes = await sql`
      SELECT target_id, value
      FROM synk_community_votes
      WHERE synk_profile_id = ${profileId}
        AND target_type = 'comment'
        AND target_id = ANY(${ids}::uuid[])
    `;
    const voteMap = {};
    for (const row of votes) {
      voteMap[String(row.target_id)] = Number(row.value) || 0;
    }
    for (const comment of mapped) {
      comment.myVote = voteMap[String(comment.id)] || 0;
    }
  }
  await attachPinnedTagsToAuthors(sql, mapped);
  return mapped;
}

async function resolvePostingPersona(sql, auth, role, requestedUsername) {
  const primary = normalizePublicUsername(auth.profile.publicUsername);
  const requested = normalizePublicUsername(requestedUsername) || primary;
  if (!requested) {
    return { ok: false, status: 400, error: "Choose a public username before posting" };
  }
  if (requested === primary) {
    return { ok: true, username: primary, isAlt: false };
  }
  if (role !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can post as an alt account" };
  }
  const alt = await findCommunityAltAccount(sql, {
    username: requested,
    ownerProfileId: auth.profile.id,
  });
  if (!alt) {
    return { ok: false, status: 403, error: "That alt account is not available" };
  }
  return { ok: true, username: alt.username, isAlt: true };
}

async function applyVote(sql, { profileId, targetType, targetId, value }) {
  const existing = await sql`
    SELECT value
    FROM synk_community_votes
    WHERE synk_profile_id = ${profileId}
      AND target_type = ${targetType}
      AND target_id = ${targetId}
    LIMIT 1
  `;
  const prev = existing[0] ? Number(existing[0].value) || 0 : 0;
  const next = value === 0 ? 0 : value;
  const delta = next - prev;

  if (next === 0) {
    if (prev !== 0) {
      await sql`
        DELETE FROM synk_community_votes
        WHERE synk_profile_id = ${profileId}
          AND target_type = ${targetType}
          AND target_id = ${targetId}
      `;
    }
  } else {
    await sql`
      INSERT INTO synk_community_votes (synk_profile_id, target_type, target_id, value)
      VALUES (${profileId}, ${targetType}, ${targetId}, ${next})
      ON CONFLICT (synk_profile_id, target_type, target_id) DO UPDATE
      SET value = EXCLUDED.value, created_at = NOW()
    `;
  }

  if (delta !== 0) {
    if (targetType === "post") {
      await sql`
        UPDATE synk_community_posts
        SET score = score + ${delta}
        WHERE id = ${targetId}
      `;
    } else {
      await sql`
        UPDATE synk_community_comments
        SET score = score + ${delta}
        WHERE id = ${targetId}
      `;
    }
  }

  return { prev, next, delta };
}


const TAG_ICON_MAX_BYTES = 512 * 1024;
const TAG_ICON_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function allowedTagIconUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/api/community-tag-icon?id=")) return raw.split("&")[0];
  try {
    const u = new URL(raw, "https://synkid.netlify.app");
    if (u.pathname === "/api/community-tag-icon" && u.searchParams.get("id")) {
      const id = u.searchParams.get("id");
      if (/^[0-9a-f-]{36}$/i.test(id)) return `/api/community-tag-icon?id=${encodeURIComponent(id)}`;
    }
  } catch (_) {}
  return undefined; // invalid
}

async function saveCommunityTagIcon(event, rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) return null;
  let contentType = "image/png";
  let base64 = raw;
  const dataMatch = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(raw);
  if (dataMatch) {
    contentType = dataMatch[1].toLowerCase().replace("image/jpg", "image/jpeg");
    base64 = dataMatch[3];
  } else if (raw.includes(",")) {
    base64 = raw.split(",").pop();
  }
  if (!TAG_ICON_TYPES.has(contentType) && !TAG_ICON_TYPES.has(contentType.replace("image/jpg", "image/jpeg"))) {
    const err = new Error("Use a PNG, JPG, WebP, or GIF icon");
    err.statusCode = 400;
    throw err;
  }
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    const err = new Error("Could not read icon data");
    err.statusCode = 400;
    throw err;
  }
  if (!buffer.length) {
    const err = new Error("Could not read icon");
    err.statusCode = 400;
    throw err;
  }
  if (buffer.length > TAG_ICON_MAX_BYTES) {
    const err = new Error("Icon too large (max 512KB)");
    err.statusCode = 400;
    throw err;
  }
  connectLambda(event);
  const store = getStore("kiosk-media");
  const id = randomUUID();
  await store.set(`community-tag-icon-${id}`, buffer, {
    metadata: {
      contentType: contentType === "image/jpg" ? "image/jpeg" : contentType,
      updatedAt: new Date().toISOString(),
      source: "community-tag-icon",
    },
  });
  return `/api/community-tag-icon?id=${encodeURIComponent(id)}&v=${Date.now()}`;
}


const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const SYNK_PHOTO_MAX_BYTES = 3.5 * 1024 * 1024;

function allowedCommunityAvatarUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/api/community-avatar?id=")) return raw.split("&")[0];
  try {
    const u = new URL(raw, "https://synkid.netlify.app");
    if (u.pathname === "/api/community-avatar" && u.searchParams.get("id")) {
      const id = u.searchParams.get("id");
      if (/^[0-9a-f-]{36}$/i.test(id)) return `/api/community-avatar?id=${encodeURIComponent(id)}`;
    }
  } catch (_) {}
  return undefined;
}

async function saveImageToStore(event, rawInput, { keyPrefix, maxBytes, source }) {
  const raw = String(rawInput || "").trim();
  if (!raw) return null;
  let contentType = "image/png";
  let base64 = raw;
  const dataMatch = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(raw);
  if (dataMatch) {
    contentType = dataMatch[1].toLowerCase().replace("image/jpg", "image/jpeg");
    base64 = dataMatch[3];
  } else if (raw.includes(",")) {
    base64 = raw.split(",").pop();
  }
  if (!AVATAR_TYPES.has(contentType) && !AVATAR_TYPES.has(contentType.replace("image/jpg", "image/jpeg"))) {
    const err = new Error("Use a PNG, JPG, WebP, or GIF image");
    err.statusCode = 400;
    throw err;
  }
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    const err = new Error("Could not read image data");
    err.statusCode = 400;
    throw err;
  }
  if (!buffer.length) {
    const err = new Error("Could not read image");
    err.statusCode = 400;
    throw err;
  }
  if (buffer.length > maxBytes) {
    const err = new Error("Image too large");
    err.statusCode = 400;
    throw err;
  }
  connectLambda(event);
  const store = getStore("kiosk-media");
  const id = randomUUID();
  await store.set(`${keyPrefix}-${id}`, buffer, {
    metadata: {
      contentType: contentType === "image/jpg" ? "image/jpeg" : contentType,
      updatedAt: new Date().toISOString(),
      source,
    },
  });
  return { id, contentType, bytes: buffer.length };
}

async function saveCommunityAvatar(event, rawInput) {
  const saved = await saveImageToStore(event, rawInput, {
    keyPrefix: "community-avatar",
    maxBytes: AVATAR_MAX_BYTES,
    source: "community-avatar",
  });
  if (!saved) return null;
  return `/api/community-avatar?id=${encodeURIComponent(saved.id)}&v=${Date.now()}`;
}

async function saveMemberSynkPhoto(event, rawInput) {
  const saved = await saveImageToStore(event, rawInput, {
    keyPrefix: "synk",
    maxBytes: SYNK_PHOTO_MAX_BYTES,
    source: "member-synk-photo",
  });
  if (!saved) return null;
  return `/api/synk-image?id=${encodeURIComponent(saved.id)}&v=${Date.now()}`;
}

function serializeTagRow(row, { pinned = false } = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    color: row.color,
    iconUrl: row.icon_url || null,
    learnMoreEnabled: row.learn_more_enabled === true,
    learnMorePageId: row.learn_more_page_id || null,
    learnMorePageSlug: row.learn_more_page_slug || row.info_page_slug || null,
    learnMorePageTitle: row.learn_more_page_title || row.info_page_title || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: Boolean(pinned),
  };
}


function sanitizeSearchQuery(raw) {
  return String(raw || "")
    .trim()
    .slice(0, 80)
    .replace(/[%_\\]/g, "");
}

async function searchCommunityPosts(sql, { query, profileId = null, sort = "new", limit = 40 } = {}) {
  const q = sanitizeSearchQuery(query);
  if (!q) return [];
  const pattern = `%${q}%`;
  const capped = Math.min(Math.max(Number(limit) || 40, 1), 80);
  const sortKey = String(sort || "new").toLowerCase();
  const byScore = sortKey === "hot" || sortKey === "top" || sortKey === "best";
  const hideForViewer = Boolean(profileId);

  const rows = byScore
    ? await sql`
        SELECT
          p.id,
          p.title,
          p.post_type,
          p.body,
          p.link_url,
          p.image_url,
          p.poll_options,
          p.score,
          p.created_at,
          p.group_id,
          p.author_username,
          p.suggestion_status,
          m.name,
          c.public_username,
          g.slug AS group_slug,
          g.name AS group_name,
          g.theme AS group_theme,
          g.is_official AS group_is_official,
          p.channel_id,
          ch.slug AS channel_slug,
          ch.name AS channel_name,
          ch.emoji AS channel_emoji,
          ch.kind AS channel_kind,
          (
            SELECT COUNT(*)::int
            FROM synk_community_comments cc
            WHERE cc.post_id = p.id
          ) AS comment_count,
          CASE
            WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
            THEN s.role
            ELSE NULL
          END AS author_role,
          CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
        FROM synk_community_posts p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_groups g ON g.id = p.group_id
        LEFT JOIN synk_community_group_channels ch ON ch.id = p.channel_id
        LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_alt_accounts a
          ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
        WHERE (
            COALESCE(p.title, '') ILIKE ${pattern}
            OR COALESCE(p.body, '') ILIKE ${pattern}
            OR COALESCE(g.slug, '') ILIKE ${pattern}
            OR COALESCE(g.name, '') ILIKE ${pattern}
          )
          AND COALESCE(g.is_official, FALSE) = FALSE
          AND (
            ${hideForViewer ? 1 : 0} = 0
            OR NOT EXISTS (
              SELECT 1
              FROM synk_community_hides hd
              WHERE hd.synk_profile_id = ${profileId}
                AND hd.post_id = p.id
            )
          )
        ORDER BY p.score DESC, p.created_at DESC
        LIMIT ${capped}
      `
    : await sql`
        SELECT
          p.id,
          p.title,
          p.post_type,
          p.body,
          p.link_url,
          p.image_url,
          p.poll_options,
          p.score,
          p.created_at,
          p.group_id,
          p.author_username,
          p.suggestion_status,
          m.name,
          c.public_username,
          g.slug AS group_slug,
          g.name AS group_name,
          g.theme AS group_theme,
          g.is_official AS group_is_official,
          p.channel_id,
          ch.slug AS channel_slug,
          ch.name AS channel_name,
          ch.emoji AS channel_emoji,
          ch.kind AS channel_kind,
          (
            SELECT COUNT(*)::int
            FROM synk_community_comments cc
            WHERE cc.post_id = p.id
          ) AS comment_count,
          CASE
            WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
            THEN s.role
            ELSE NULL
          END AS author_role,
          CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
        FROM synk_community_posts p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_groups g ON g.id = p.group_id
        LEFT JOIN synk_community_group_channels ch ON ch.id = p.channel_id
        LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
        LEFT JOIN synk_community_alt_accounts a
          ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
        WHERE (
            COALESCE(p.title, '') ILIKE ${pattern}
            OR COALESCE(p.body, '') ILIKE ${pattern}
            OR COALESCE(g.slug, '') ILIKE ${pattern}
            OR COALESCE(g.name, '') ILIKE ${pattern}
          )
          AND COALESCE(g.is_official, FALSE) = FALSE
          AND (
            ${hideForViewer ? 1 : 0} = 0
            OR NOT EXISTS (
              SELECT 1
              FROM synk_community_hides hd
              WHERE hd.synk_profile_id = ${profileId}
                AND hd.post_id = p.id
            )
          )
        ORDER BY p.created_at DESC
        LIMIT ${capped}
      `;

  return enrichPosts(sql, rows, profileId);
}

async function searchCommunityUsers(sql, query, limit = 30) {
  const q = sanitizeSearchQuery(query);
  if (!q) return [];
  const pattern = `%${q}%`;
  const capped = Math.min(Math.max(Number(limit) || 30, 1), 50);
  const rows = await sql`
    SELECT * FROM (
      SELECT
        c.public_username AS username,
        COALESCE(c.display_name, '') AS display_name,
        COALESCE(c.avatar_url, '') AS avatar_url,
        FALSE AS is_alt,
        c.created_at
      FROM synk_community_profiles c
      WHERE c.public_username ILIKE ${pattern}
         OR COALESCE(c.display_name, '') ILIKE ${pattern}
      UNION ALL
      SELECT
        a.public_username AS username,
        COALESCE(NULLIF(btrim(a.display_name), ''), COALESCE(a.label, ''), a.public_username) AS display_name,
        COALESCE(a.avatar_url, '') AS avatar_url,
        TRUE AS is_alt,
        a.created_at
      FROM synk_community_alt_accounts a
      WHERE a.public_username ILIKE ${pattern}
         OR COALESCE(a.display_name, '') ILIKE ${pattern}
         OR COALESCE(a.label, '') ILIKE ${pattern}
    ) u
    ORDER BY u.username ASC
    LIMIT ${capped}
  `;
  return rows.map((row) => ({
    username: row.username,
    displayName: String(row.display_name || "").trim(),
    avatarUrl: String(row.avatar_url || "").trim(),
    isAlt: Boolean(row.is_alt),
    joinedAt: row.created_at || null,
  }));
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    let body = {};
    if (event.httpMethod !== "GET") {
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }
    }

    const auth = await requireHubSession(sql, event, body);
    if (!auth.ok) {
      return json(auth.status || 401, { error: auth.error || "Unauthorized" });
    }

    const role = await getCommunityStaffRole(sql, auth.profile.id);
    const qs = event.queryStringParameters || {};
    const ip = clientIp(event);
    const alts = role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
    if (alts.length) {
      for (const alt of alts) {
        alt.tags = await listUsernameTags(sql, alt.username);
        alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
      }
    }
    const primaryUsername = normalizePublicUsername(auth.profile.publicUsername);
    const myTags = primaryUsername
      ? await listUsernameTags(sql, primaryUsername)
      : [];
    const myPinnedTag = myTags.find((tag) => tag.pinned) || null;
    const tagCatalog = await listCommunityTags(sql);
    const unreadCount = await getUnreadCount(sql, auth.profile.id);

    if (event.httpMethod === "GET") {
      const groupsRaw = await listCommunityGroups(sql);
      const groups = await markGroupsJoined(sql, groupsRaw, auth.profile.id);

      const releaseNotesVersion = String(
        qs.releaseNotes || qs.release_notes || qs.notesVersion || ""
      ).trim();
      if (releaseNotesVersion && releaseNotesVersion !== "1") {
        const row = await getAppUpdateReleaseNotes(sql, releaseNotesVersion);
        if (!row) return json(404, { error: "Release notes not found" });
        const payload = buildReleaseNotesPayload(row.notes || row.body, {
          isStaff: isCommunityStaffRole(role),
          version: row.version,
          body: row.body,
          createdAt: row.createdAt,
        });
        return json(200, { ok: true, ...payload });
      }
      if (qs.releaseNotes === "1" || qs.release_notes === "1") {
        const ver = String(qs.version || qs.v || "").trim();
        if (!ver) return json(400, { error: "version required" });
        const row = await getAppUpdateReleaseNotes(sql, ver);
        if (!row) return json(404, { error: "Release notes not found" });
        const payload = buildReleaseNotesPayload(row.notes || row.body, {
          isStaff: isCommunityStaffRole(role),
          version: row.version,
          body: row.body,
          createdAt: row.createdAt,
        });
        return json(200, { ok: true, ...payload });
      }

      if (qs.inbox === "1" || qs.notifications === "1") {
        const notifications = await loadNotifications(sql, auth.profile.id, {
          username: primaryUsername,
        });
        return json(200, {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          notifications,
          unreadCount,
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
        });
      }

      if (qs.shell === "1" || qs.me === "1") {
        const payload = {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          groups,
          posts: [],
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
          unreadCount,
        };
        if (isCommunityStaffRole(role)) {
          payload.staff = await listCommunityStaff(sql);
        }
        return json(200, payload);
      }

      if (qs.dms === "1" || qs.messages === "1") {
        if (!primaryUsername) {
          return json(400, { error: "Set a username first" });
        }
        const threads = await listDmThreads(sql, primaryUsername);
        return json(200, {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          threads,
          unreadCount,
          dmUnread: 0,
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
        });
      }

      const dmThreadId = String(qs.dm || qs.threadId || "").trim();
      const dmUser = normalizePublicUsername(qs.dmUser || qs.with || "");
      if (dmThreadId || dmUser) {
        if (!primaryUsername) {
          return json(400, { error: "Set a username first" });
        }
        let thread = null;
        let messages = [];
        if (dmThreadId) {
          if (!isUuid(dmThreadId)) return json(400, { error: "Invalid thread id" });
          const result = await listDmMessages(sql, dmThreadId, primaryUsername);
          if (!result.ok) return json(404, { error: result.error || "Thread not found" });
          thread = result.thread;
          messages = result.messages;
        } else {
          const opened = await getOrCreateDmThread(sql, primaryUsername, dmUser);
          if (!opened.ok) return json(400, { error: opened.error || "Could not open thread" });
          const result = await listDmMessages(sql, opened.thread.id, primaryUsername);
          if (!result.ok) return json(404, { error: result.error || "Thread not found" });
          thread = result.thread;
          messages = result.messages;
        }
        return json(200, {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          thread,
          messages,
          unreadCount,
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
        });
      }

      const postId = String(qs.post || qs.postId || "").trim();
      if (postId) {
        if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
        const post = await loadPostById(sql, postId, auth.profile.id);
        if (!post) return json(404, { error: "Post not found" });
        await attachPinnedTagsToAuthors(sql, [post]);
        const comments = await loadComments(sql, postId, auth.profile.id);
        const payload = {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          groups,
          group: post.group || null,
          profile: null,
          post,
          comments,
          posts: [post],
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
          unreadCount,
        };
        if (isCommunityStaffRole(role)) {
          payload.staff = await listCommunityStaff(sql);
        }
        return json(200, payload);
      }

      const searchQuery = sanitizeSearchQuery(qs.q || qs.search || qs.query || "");
      if (searchQuery) {
        const tabRaw = String(qs.tab || "all").trim().toLowerCase();
        const tab = ["all", "popular", "groups", "users"].includes(tabRaw) ? tabRaw : "all";
        const sort = String(qs.sort || "").trim().toLowerCase() || (tab === "popular" ? "hot" : "new");
        const wantPosts = tab === "all" || tab === "popular";
        const wantUsers = tab === "all" || tab === "users";
        const wantGroups = tab === "all" || tab === "groups";

        const posts = wantPosts
          ? await searchCommunityPosts(sql, {
              query: searchQuery,
              profileId: auth.profile.id,
              sort: tab === "popular" ? "hot" : sort,
              limit: tab === "all" ? 30 : 50,
            })
          : [];
        const users = wantUsers ? await searchCommunityUsers(sql, searchQuery, tab === "all" ? 12 : 40) : [];
        const matchedGroups = wantGroups
          ? groups.filter((g) => {
              const hay = `${g.slug || ""} ${g.name || ""} ${g.description || ""}`.toLowerCase();
              return hay.includes(searchQuery.toLowerCase());
            })
          : [];

        if (wantPosts) await attachPinnedTagsToAuthors(sql, posts);

        const payload = {
          ok: true,
          me: mePayload(auth, role, alts, myTags, myPinnedTag),
          groups,
          matchedGroups,
          users,
          posts,
          search: { query: searchQuery, tab },
          tags: tagCatalog,
          ownerUsername: COMMUNITY_OWNER_USERNAME,
          unreadCount,
        };
        if (isCommunityStaffRole(role)) {
          payload.staff = await listCommunityStaff(sql);
        }
        return json(200, payload);
      }

      const profileUsername = normalizePublicUsername(qs.user || qs.username || qs.u || "");
      const groupSlug = normalizeGroupSlug(qs.group || qs.slug || "");
      const feed = String(qs.feed || "").trim().toLowerCase();
      const sort = String(qs.sort || "").trim().toLowerCase() || "new";

      let activeGroup = null;
      let activeChannel = null;
      let profile = null;
      let posts = [];

      if (profileUsername) {
        profile = await findCommunityPublicProfile(sql, profileUsername);
        if (!profile) return json(404, { error: "Profile not found" });
        const isSelf = Boolean(primaryUsername && primaryUsername === profileUsername);
        profile.isSelf = isSelf;
        if (primaryUsername && !isSelf) {
          const friendship = await getFriendship(sql, primaryUsername, profileUsername);
          profile.friendship = {
            status: friendshipViewerStatus(friendship),
          };
          profile.canMessage = await canDm(sql, primaryUsername, profileUsername);
        } else {
          profile.friendship = { status: "none" };
          profile.canMessage = false;
        }
        posts = await loadPosts(sql, {
          authorUsername: profileUsername,
          profileId: auth.profile.id,
          sort,
        });
      } else if (feed === "saved") {
        posts = await loadPosts(sql, {
          profileId: auth.profile.id,
          savedOnly: true,
          sort: sort === "hot" || sort === "top" ? sort : "new",
        });
      } else if (feed === "popular") {
        posts = await loadPosts(sql, {
          profileId: auth.profile.id,
          sort: "hot",
          excludeOfficial: true,
        });
      } else if (feed === "home") {
        const joined = await listJoinedGroupIdSet(sql, auth.profile.id);
        posts = await loadPosts(sql, {
          profileId: auth.profile.id,
          joinedOnly: joined.size > 0,
          sort,
          excludeOfficial: true,
        });
      } else {
        if (groupSlug) {
          activeGroup = await findCommunityGroup(sql, { slug: groupSlug });
          if (!activeGroup) return json(404, { error: "Group not found" });
          activeGroup = await hydrateCommunityGroup(sql, activeGroup);
          activeGroup = {
            ...activeGroup,
            joined: (await listJoinedGroupIdSet(sql, auth.profile.id)).has(
              String(activeGroup.id)
            ),
          };
        }
        const channelSlug = String(qs.channel || qs.channelSlug || "")
          .trim()
          .toLowerCase();
        if (activeGroup && (channelSlug || qs.channelId)) {
          activeChannel = await findGroupChannel(sql, {
            id: qs.channelId,
            groupId: activeGroup.id,
            slug: channelSlug,
          });
        }
        // Official Synk Discord group always scopes the feed to a channel (default: general).
        if (
          activeGroup &&
          !activeChannel &&
          (activeGroup.isOfficial || activeGroup.slug === "synk")
        ) {
          activeChannel =
            (activeGroup.channels || []).find((c) => c.slug === "general") ||
            (activeGroup.channels || [])[0] ||
            null;
          if (!activeChannel) {
            activeChannel = await findGroupChannel(sql, {
              groupId: activeGroup.id,
              slug: "general",
            });
          }
        }
        posts = await loadPosts(sql, {
          groupId: activeGroup ? activeGroup.id : null,
          channelId: activeChannel ? activeChannel.id : null,
          profileId: auth.profile.id,
          sort,
        });
      }

      await attachPinnedTagsToAuthors(sql, posts);

      const payload = {
        ok: true,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
        groups,
        group: activeGroup,
        channel: activeChannel,
        profile,
        posts,
        tags: tagCatalog,
        ownerUsername: COMMUNITY_OWNER_USERNAME,
        unreadCount,
      };
      if (isCommunityStaffRole(role)) {
        payload.staff = await listCommunityStaff(sql);
      }
      return json(200, payload);
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const action = String(body.action || "post").trim().toLowerCase();

    if (action === "set-username") {
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username || username.length < 3) {
        return json(400, {
          error: "Username must be 3–24 letters, numbers, or underscores",
        });
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        return json(400, { error: "Use only letters, numbers, and underscores" });
      }
      if (await isCommunityUsernameTaken(sql, username, { exceptProfileId: auth.profile.id })) {
        return json(409, { error: "That username is already taken" });
      }
      try {
        await sql`
          INSERT INTO synk_community_profiles (synk_profile_id, public_username)
          VALUES (${auth.profile.id}, ${username})
          ON CONFLICT (synk_profile_id) DO UPDATE
          SET public_username = EXCLUDED.public_username, updated_at = NOW()
        `;
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That username is already taken" });
        }
        throw err;
      }

      if (username === COMMUNITY_OWNER_USERNAME) {
        await ensureCommunityOwner(sql);
      }

      await logSynkEvent(sql, {
        eventType: "community_username",
        profileId: auth.profile.id,
        ip,
        detail: username,
      });
      const nextRole = await getCommunityStaffRole(sql, auth.profile.id);
      const nextAlts =
        nextRole === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      return json(200, {
        ok: true,
        publicUsername: username,
        me: mePayload(
          { ...auth, profile: { ...auth.profile, publicUsername: username } },
          nextRole,
          nextAlts
        ),
      });
    }

    if (action === "set-display-name") {
      const primary = normalizePublicUsername(auth.profile.publicUsername);
      if (!primary) return json(400, { error: "Set a username first" });
      const requested = normalizePublicUsername(body.username || body.asUsername || primary) || primary;
      const result = await setDisplayNameForUsername(
        sql,
        requested,
        body.displayName != null ? body.displayName : body.name,
        auth.profile.id
      );
      if (!result.ok) return json(400, { error: result.error || "Could not save display name" });
      if (requested === primary) {
        auth.profile.displayName = result.displayName;
      }
      const nextAlts =
        role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      if (nextAlts.length) {
        for (const alt of nextAlts) {
          alt.tags = await listUsernameTags(sql, alt.username);
          alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
        }
      }
      return json(200, {
        ok: true,
        username: result.username,
        displayName: result.displayName,
        me: mePayload(auth, role, nextAlts, myTags, myPinnedTag),
      });
    }

    if (action === "set-bio") {
      const primary = normalizePublicUsername(auth.profile.publicUsername);
      if (!primary) return json(400, { error: "Set a username first" });
      const requested = normalizePublicUsername(body.username || body.asUsername || primary) || primary;
      const result = await setBioForUsername(
        sql,
        requested,
        body.bio != null ? body.bio : body.text,
        auth.profile.id
      );
      if (!result.ok) return json(400, { error: result.error || "Could not save bio" });
      if (requested === primary) {
        auth.profile.bio = result.bio;
      }
      const nextAlts =
        role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      if (nextAlts.length) {
        for (const alt of nextAlts) {
          alt.tags = await listUsernameTags(sql, alt.username);
          alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
        }
      }
      return json(200, {
        ok: true,
        username: result.username,
        bio: result.bio,
        me: mePayload(auth, role, nextAlts, myTags, myPinnedTag),
      });
    }

    if (action === "set-dm-policy") {
      const primary = normalizePublicUsername(auth.profile.publicUsername);
      if (!primary) return json(400, { error: "Set a username first" });
      const requested = normalizePublicUsername(body.username || body.asUsername || primary) || primary;
      const rawPolicy =
        body.dmPolicy != null
          ? body.dmPolicy
          : body.policy != null
            ? body.policy
            : body.dm_policy;
      const normalized = normalizeDmPolicy(rawPolicy);
      if (
        rawPolicy != null &&
        String(rawPolicy).trim() !== "" &&
        !["friends", "nobody", "everyone"].includes(
          String(rawPolicy).trim().toLowerCase()
        )
      ) {
        return json(400, { error: "dmPolicy must be friends, nobody, or everyone" });
      }
      const result = await setDmPolicyForUsername(
        sql,
        requested,
        normalized,
        auth.profile.id
      );
      if (!result.ok) return json(400, { error: result.error || "Could not save DM policy" });
      if (requested === primary) {
        auth.profile.dmPolicy = result.dmPolicy;
      }
      const nextAlts =
        role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      if (nextAlts.length) {
        for (const alt of nextAlts) {
          alt.tags = await listUsernameTags(sql, alt.username);
          alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
        }
      }
      return json(200, {
        ok: true,
        username: result.username,
        dmPolicy: result.dmPolicy,
        me: mePayload(auth, role, nextAlts, myTags, myPinnedTag),
      });
    }

    if (action === "friend-request") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const target = normalizePublicUsername(body.username || body.user || body.to);
      if (!target) return json(400, { error: "Username required" });
      const result = await requestFriendship(sql, primaryUsername, target);
      if (!result.ok) return json(400, { error: result.error || "Could not send request" });
      // Notify the other person so it shows in their bell.
      try {
        let targetProfileId = await findCommunityProfileIdByUsername(sql, target);
        if (!targetProfileId) {
          const alt = await findCommunityAltAccount(sql, target);
          targetProfileId = alt && (alt.ownerProfileId || alt.owner_synk_profile_id) || null;
        }
        if (targetProfileId) {
          await createNotification(sql, {
            profileId: targetProfileId,
            kind: "friend_request",
            actorUsername: primaryUsername,
            body: `${primaryUsername} sent you a friend request.`,
          });
        }
      } catch (_) {}
      return json(200, {
        ok: true,
        username: target,
        friendship: {
          status: friendshipViewerStatus(result.friendship),
        },
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "friend-accept") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const target = normalizePublicUsername(body.username || body.user || body.from);
      if (!target) return json(400, { error: "Username required" });
      const result = await respondFriendship(sql, primaryUsername, target, true);
      if (!result.ok) return json(400, { error: result.error || "Could not accept request" });
      try {
        let targetProfileId = await findCommunityProfileIdByUsername(sql, target);
        if (!targetProfileId) {
          const alt = await findCommunityAltAccount(sql, target);
          targetProfileId = alt && (alt.ownerProfileId || alt.owner_synk_profile_id) || null;
        }
        if (targetProfileId) {
          await createNotification(sql, {
            profileId: targetProfileId,
            kind: "friend_accept",
            actorUsername: primaryUsername,
            body: `${primaryUsername} accepted your friend request.`,
          });
        }
      } catch (_) {}
      return json(200, {
        ok: true,
        username: target,
        friendship: {
          status: friendshipViewerStatus(result.friendship),
        },
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "friend-decline") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const target = normalizePublicUsername(body.username || body.user || body.from);
      if (!target) return json(400, { error: "Username required" });
      const result = await respondFriendship(sql, primaryUsername, target, false);
      if (!result.ok) return json(400, { error: result.error || "Could not decline request" });
      return json(200, {
        ok: true,
        username: target,
        friendship: { status: "none" },
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "friend-remove") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const target = normalizePublicUsername(body.username || body.user);
      if (!target) return json(400, { error: "Username required" });
      const result = await removeFriendship(sql, primaryUsername, target);
      if (!result.ok) return json(400, { error: result.error || "Could not remove friend" });
      return json(200, {
        ok: true,
        username: target,
        friendship: { status: "none" },
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-friends") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const usernames = await listFriends(sql, primaryUsername);
      const [names, avatars] = await Promise.all([
        getDisplayNamesByUsernames(sql, usernames),
        getAvatarsByUsernames(sql, usernames),
      ]);
      return json(200, {
        ok: true,
        friends: usernames.map((username) => ({
          username,
          displayName: names[username] || "",
          avatarUrl: avatars[username] || "",
        })),
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-list") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const threads = await listDmThreads(sql, primaryUsername);
      return json(200, {
        ok: true,
        threads,
        dmUnread: 0,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-open") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const target = normalizePublicUsername(body.username || body.user || body.with);
      if (!target) return json(400, { error: "Username required" });
      const opened = await getOrCreateDmThread(sql, primaryUsername, target);
      if (!opened.ok) return json(400, { error: opened.error || "Could not open thread" });
      const result = await listDmMessages(sql, opened.thread.id, primaryUsername);
      if (!result.ok) return json(404, { error: result.error || "Thread not found" });
      return json(200, {
        ok: true,
        thread: result.thread,
        messages: result.messages,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-send") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      let target = normalizePublicUsername(body.username || body.user || body.to);
      const threadId = String(body.threadId || body.thread || "").trim();
      if (!target && threadId) {
        if (!isUuid(threadId)) return json(400, { error: "Invalid thread id" });
        const existing = await getDmThreadById(sql, threadId, primaryUsername);
        if (!existing) return json(404, { error: "Thread not found" });
        target = existing.otherUser;
      }
      if (!target) return json(400, { error: "Username or threadId required" });
      const result = await sendDm(
        sql,
        primaryUsername,
        target,
        body.body != null ? body.body : body.message
      );
      if (!result.ok) return json(400, { error: result.error || "Could not send message" });
      return json(200, {
        ok: true,
        message: result.message,
        thread: result.thread,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-edit") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const messageId = String(body.messageId || body.id || "").trim();
      if (!isUuid(messageId)) return json(400, { error: "Invalid message id" });
      const result = await editDmMessage(
        sql,
        messageId,
        primaryUsername,
        body.body != null ? body.body : body.message
      );
      if (!result.ok) return json(400, { error: result.error || "Could not edit message" });
      return json(200, {
        ok: true,
        message: result.message,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-delete") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const messageId = String(body.messageId || body.id || "").trim();
      if (!isUuid(messageId)) return json(400, { error: "Invalid message id" });
      const result = await deleteDmMessage(sql, messageId, primaryUsername);
      if (!result.ok) return json(400, { error: result.error || "Could not delete message" });
      return json(200, {
        ok: true,
        mode: result.mode,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    if (action === "dm-react") {
      if (!primaryUsername) return json(400, { error: "Set a username first" });
      const messageId = String(body.messageId || body.id || "").trim();
      if (!isUuid(messageId)) return json(400, { error: "Invalid message id" });
      const emoji = String(body.emoji || body.reaction || "").trim();
      const result = await reactDmMessage(sql, messageId, primaryUsername, emoji);
      if (!result.ok) return json(400, { error: result.error || "Could not react" });
      return json(200, {
        ok: true,
        message: result.message,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

    
    if (action === "set-avatar") {
      const primary = normalizePublicUsername(auth.profile.publicUsername);
      if (!primary) return json(400, { error: "Set a username first" });
      const requested = normalizePublicUsername(body.username || body.asUsername || primary) || primary;
      let avatarUrl = null;
      if (body.clear || body.remove) {
        avatarUrl = null;
      } else if (body.avatarUrl && allowedCommunityAvatarUrl(body.avatarUrl) !== undefined) {
        const allowed = allowedCommunityAvatarUrl(body.avatarUrl);
        if (allowed === undefined) return json(400, { error: "Invalid avatar URL" });
        avatarUrl = allowed;
      } else if (body.imageData || body.avatarData || body.data) {
        try {
          avatarUrl = await saveCommunityAvatar(event, body.imageData || body.avatarData || body.data);
        } catch (err) {
          return json(err.statusCode || 400, { error: err.message || "Could not save avatar" });
        }
      } else {
        return json(400, { error: "Choose an image" });
      }
      const result = await setAvatarForUsername(sql, requested, avatarUrl, auth.profile.id);
      if (!result.ok) return json(400, { error: result.error || "Could not save avatar" });
      if (requested === primary) auth.profile.avatarUrl = result.avatarUrl;
      const nextAlts = role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      if (nextAlts.length) {
        for (const alt of nextAlts) {
          alt.tags = await listUsernameTags(sql, alt.username);
          alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
        }
      }
      return json(200, {
        ok: true,
        username: result.username,
        avatarUrl: result.avatarUrl,
        me: mePayload(auth, role, nextAlts, myTags, myPinnedTag),
      });
    }

    if (action === "set-synk-photo") {
      let photoUrl = "";
      try {
        photoUrl = await saveMemberSynkPhoto(event, body.imageData || body.photoData || body.data);
      } catch (err) {
        return json(err.statusCode || 400, { error: err.message || "Could not save photo" });
      }
      if (!photoUrl) return json(400, { error: "Choose an image" });
      const result = await updateSynkProfilePhoto(sql, auth.profile.id, photoUrl);
      if (!result.ok) return json(400, { error: result.error || "Could not update Synk photo" });
      auth.profile.photoUrl = result.photoUrl;
      return json(200, {
        ok: true,
        photoUrl: signedPhotoUrl(result.photoUrl),
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
      });
    }

if (action === "create-alt") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can create alt accounts" });
      }
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Set your primary username before creating alts" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      const label = normalizeAltLabel(body.label || body.name || "");
      if (!username || username.length < 3) {
        return json(400, {
          error: "Alt username must be 3–24 letters, numbers, or underscores",
        });
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        return json(400, { error: "Use only letters, numbers, and underscores" });
      }
      if (
        username === COMMUNITY_OWNER_USERNAME ||
        username === auth.profile.publicUsername
      ) {
        return json(400, { error: "Pick a different username for this alt" });
      }
      if (await isCommunityUsernameTaken(sql, username)) {
        return json(409, { error: "That username is already taken" });
      }
      if (alts.length >= 20) {
        return json(400, { error: "You already have the maximum number of alt accounts" });
      }
      try {
        const rows = await sql`
          INSERT INTO synk_community_alt_accounts (owner_synk_profile_id, public_username, label)
          VALUES (${auth.profile.id}, ${username}, ${label})
          RETURNING id, public_username, label, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_alt_create",
          profileId: auth.profile.id,
          ip,
          detail: username,
        });
        return json(201, {
          ok: true,
          alt: {
            id: rows[0].id,
            username: rows[0].public_username,
            label: rows[0].label || "",
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            isAlt: true,
          },
          alts: await listOwnerAltAccounts(sql, auth.profile.id),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That username is already taken" });
        }
        throw err;
      }
    }

    if (action === "delete-alt") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove alt accounts" });
      }
      const alt = await findCommunityAltAccount(sql, {
        id: body.altId || body.id,
        username: body.username || body.publicUsername,
        ownerProfileId: auth.profile.id,
      });
      if (!alt) return json(404, { error: "Alt account not found" });
      await sql`
        DELETE FROM synk_community_alt_accounts
        WHERE id = ${alt.id}
          AND owner_synk_profile_id = ${auth.profile.id}
      `;
      await logSynkEvent(sql, {
        eventType: "community_alt_delete",
        profileId: auth.profile.id,
        ip,
        detail: alt.username,
      });
      return json(200, {
        ok: true,
        alts: await listOwnerAltAccounts(sql, auth.profile.id),
      });
    }

    if (action === "create-group") {
      if (!isCommunityStaffRole(role)) {
        return json(403, { error: "Only community admins can create groups" });
      }
      const name = normalizeGroupName(body.name || body.title);
      const slug = normalizeGroupSlug(body.slug || name);
      const description = normalizeGroupDescription(body.description || body.about || "");
      if (!name) return json(400, { error: "Group name is required" });
      if (!slug || slug.length < 2) {
        return json(400, { error: "Group url needs at least 2 characters" });
      }
      try {
        const rows = await sql`
          INSERT INTO synk_community_groups (slug, name, description, theme, is_official, created_by)
          VALUES (${slug}, ${name}, ${description}, 'standard', FALSE, ${auth.profile.id})
          RETURNING id, slug, name, description, theme, is_official, created_by, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_group_create",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        await sql`
          INSERT INTO synk_community_memberships (synk_profile_id, group_id)
          VALUES (${auth.profile.id}, ${rows[0].id})
          ON CONFLICT DO NOTHING
        `;
        await createGroupRole(sql, rows[0].id, { name: "Member", color: "#94a3b8", sortOrder: 0 });
        await createGroupRole(sql, rows[0].id, { name: "Moderator", color: "#22c55e", sortOrder: 1 });
        return json(201, {
          ok: true,
          group: {
            id: rows[0].id,
            slug: rows[0].slug,
            name: rows[0].name,
            description: rows[0].description || "",
            theme: rows[0].theme || "standard",
            isOfficial: rows[0].is_official === true,
            createdBy: rows[0].created_by,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            postCount: 0,
            joined: true,
            roles: await listGroupRoles(sql, rows[0].id),
          },
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That group url is already taken" });
        }
        throw err;
      }
    }

    if (action === "add-admin") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can add admins" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const member = await sql`
        SELECT c.synk_profile_id, c.public_username, p.name
        FROM synk_community_profiles c
        JOIN synk_profiles p ON p.id = c.synk_profile_id
        WHERE c.public_username = ${username}
        LIMIT 1
      `;
      if (!member[0]) {
        return json(404, { error: "No community member with that username" });
      }
      if (member[0].public_username === COMMUNITY_OWNER_USERNAME) {
        return json(400, { error: `@${COMMUNITY_OWNER_USERNAME} is already the owner` });
      }
      await sql`
        INSERT INTO synk_community_staff (synk_profile_id, role, created_by)
        VALUES (${member[0].synk_profile_id}, 'admin', ${auth.profile.id})
        ON CONFLICT (synk_profile_id) DO UPDATE
        SET
          role = CASE
            WHEN synk_community_staff.role = 'owner' THEN 'owner'
            ELSE 'admin'
          END,
          updated_at = NOW()
      `;
      await logSynkEvent(sql, {
        eventType: "community_admin_add",
        profileId: auth.profile.id,
        ip,
        detail: username,
      });
      return json(200, {
        ok: true,
        staff: await listCommunityStaff(sql),
      });
    }

    if (action === "remove-admin") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove admins" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      const targetId = String(body.profileId || body.id || "").trim();
      let target = null;
      if (username) {
        const rows = await sql`
          SELECT c.synk_profile_id, c.public_username, s.role
          FROM synk_community_profiles c
          LEFT JOIN synk_community_staff s ON s.synk_profile_id = c.synk_profile_id
          WHERE c.public_username = ${username}
          LIMIT 1
        `;
        target = rows[0] || null;
      } else if (targetId) {
        const rows = await sql`
          SELECT c.synk_profile_id, c.public_username, s.role
          FROM synk_community_staff s
          LEFT JOIN synk_community_profiles c ON c.synk_profile_id = s.synk_profile_id
          WHERE s.synk_profile_id = ${targetId}
          LIMIT 1
        `;
        target = rows[0] || null;
      }
      if (!target || !target.synk_profile_id) {
        return json(404, { error: "Admin not found" });
      }
      if (target.role === "owner" || target.public_username === COMMUNITY_OWNER_USERNAME) {
        return json(400, { error: "Cannot remove the owner" });
      }
      await sql`
        DELETE FROM synk_community_staff
        WHERE synk_profile_id = ${target.synk_profile_id}
          AND role = 'admin'
      `;
      await logSynkEvent(sql, {
        eventType: "community_admin_remove",
        profileId: auth.profile.id,
        ip,
        detail: target.public_username || target.synk_profile_id,
      });
      return json(200, {
        ok: true,
        staff: await listCommunityStaff(sql),
      });
    }

    if (action === "post" || action === "create") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username before posting" });
      }

      let title = normalizeTitle(body.title);
      let text = normalizePostBody(body.body || body.text || body.message);
      // Backward compatible: title may be the first line of body.
      if (!title && text) {
        const lines = text.split("\n");
        title = normalizeTitle(lines[0] || "");
        text = lines.slice(1).join("\n").trim();
      }
      if (!title || title.length < 2) {
        return json(400, { error: "Title needs at least 2 characters" });
      }

      const postType = normalizePostType(body.type || body.postType || body.post_type || "text");
      if (!postType) {
        return json(400, { error: "Post type must be text, link, image, or poll" });
      }

      let linkUrl = null;
      let imageUrl = null;
      let pollOptions = null;

      if (postType === "link") {
        linkUrl = normalizeLinkUrl(body.linkUrl || body.link_url || body.url || body.link);
        if (!linkUrl) {
          return json(400, { error: "Link posts need a valid http(s) URL" });
        }
      } else if (postType === "image") {
        imageUrl = normalizeImageUrl(
          body.imageUrl || body.image_url || body.image || body.url
        );
        if (!imageUrl) {
          return json(400, {
            error:
              "Image posts need an https URL or a data:image/(png|jpeg|gif|webp);base64 payload",
          });
        }
      } else if (postType === "poll") {
        pollOptions = normalizePollOptions(
          body.pollOptions || body.poll_options || body.options
        );
        if (!pollOptions) {
          return json(400, { error: "Polls need 2–6 unique options" });
        }
      }

      const persona = await resolvePostingPersona(
        sql,
        auth,
        role,
        body.asUsername || body.authorUsername || body.persona
      );
      if (!persona.ok) {
        return json(persona.status || 403, { error: persona.error || "Could not post" });
      }

      let group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) {
        group = await findCommunityGroup(sql, { slug: "synk" });
      }
      if (!group) {
        return json(400, { error: "Pick a group to post in" });
      }

      const pollJson = pollOptions ? JSON.stringify(pollOptions) : null;
      let channel = null;
      if (body.channelId || body.channel || body.channelSlug) {
        channel = await findGroupChannel(sql, {
          id: body.channelId,
          groupId: group.id,
          slug: body.channel || body.channelSlug,
        });
        if (!channel) return json(400, { error: "Channel not found in this group" });
      } else if (group.isOfficial || group.slug === "synk") {
        const hydrated = await hydrateCommunityGroup(sql, group);
        channel =
          (hydrated.channels || []).find((c) => c.slug === "general") ||
          (hydrated.channels || [])[0] ||
          null;
      }
      if (channel) {
        const kind = normalizeChannelKind(channel.kind, channel.slug);
        if (
          (kind === "announcements" || kind === "readonly") &&
          !isCommunityStaffRole(role)
        ) {
          return json(403, {
            error:
              kind === "announcements"
                ? "Only Synk staff can post announcements"
                : "Only Synk staff can post in this channel",
          });
        }
      }
      const suggestionStatus =
        channel && normalizeChannelKind(channel.kind, channel.slug) === "suggestions"
          ? "open"
          : null;
      const rows = await sql`
        INSERT INTO synk_community_posts (
          synk_profile_id,
          group_id,
          channel_id,
          title,
          post_type,
          body,
          link_url,
          image_url,
          poll_options,
          score,
          author_username,
          suggestion_status
        )
        VALUES (
          ${auth.profile.id},
          ${group.id},
          ${channel ? channel.id : null},
          ${title},
          ${postType},
          ${text || ""},
          ${linkUrl},
          ${imageUrl},
          ${pollJson}::jsonb,
          1,
          ${persona.username},
          ${suggestionStatus}
        )
        RETURNING
          id, title, post_type, body, link_url, image_url, poll_options,
          score, created_at, group_id, author_username, channel_id, suggestion_status
      `;

      await sql`
        INSERT INTO synk_community_votes (synk_profile_id, target_type, target_id, value)
        VALUES (${auth.profile.id}, 'post', ${rows[0].id}, 1)
        ON CONFLICT (synk_profile_id, target_type, target_id) DO UPDATE
        SET value = 1, created_at = NOW()
      `;

      await sql`
        INSERT INTO synk_community_memberships (synk_profile_id, group_id)
        VALUES (${auth.profile.id}, ${group.id})
        ON CONFLICT (synk_profile_id, group_id) DO NOTHING
      `;

      await logSynkEvent(sql, {
        eventType: "community_post",
        profileId: auth.profile.id,
        ip,
        detail: `${group.slug}:${persona.username}:${rows[0].id}`,
      });

      const post = mapPost({
        ...rows[0],
        name: persona.isAlt ? "" : auth.profile.name,
        public_username: auth.profile.publicUsername,
        group_slug: group.slug,
        group_name: group.name,
        author_role: persona.isAlt ? null : role || null,
        is_alt: persona.isAlt,
        comment_count: 0,
        my_vote: 1,
        saved: false,
        hidden: false,
        my_poll_vote: null,
        poll_counts: pollOptions ? pollOptions.map(() => 0) : null,
      });
      const pinnedTag = (await getPinnedTagForUsername(sql, persona.username)) || null;
      post.author.pinnedTag = pinnedTag;

      return json(201, {
        ok: true,
        post,
      });
    }


    if (action === "set-suggestion-status") {
      if (!isCommunityStaffRole(role)) {
        return json(403, { error: "Only Synk staff can accept or deny suggestions" });
      }
      const postId = String(body.postId || body.id || "").trim();
      const status = normalizeSuggestionStatus(body.status || body.suggestionStatus);
      if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
      if (!status) return json(400, { error: "status must be open, accepted, or denied" });
      const rows = await sql`
        SELECT
          p.id,
          p.suggestion_status,
          ch.kind AS channel_kind,
          ch.slug AS channel_slug
        FROM synk_community_posts p
        LEFT JOIN synk_community_group_channels ch ON ch.id = p.channel_id
        WHERE p.id = ${postId}
        LIMIT 1
      `;
      if (!rows[0]) return json(404, { error: "Post not found" });
      const kind = normalizeChannelKind(rows[0].channel_kind, rows[0].channel_slug);
      if (kind !== "suggestions" && rows[0].suggestion_status == null) {
        return json(400, { error: "This post is not a suggestion" });
      }
      const updated = await sql`
        UPDATE synk_community_posts
        SET suggestion_status = ${status}
        WHERE id = ${postId}
        RETURNING id, suggestion_status
      `;
      return json(200, {
        ok: true,
        postId: updated[0].id,
        suggestionStatus: updated[0].suggestion_status || status,
      });
    }

    if (action === "vote") {
      const targetType = String(body.targetType || body.target_type || "post")
        .trim()
        .toLowerCase();
      const targetId = String(body.targetId || body.target_id || body.postId || body.id || "")
        .trim();
      const rawValue = body.value != null ? body.value : body.vote;
      const value = Number(rawValue);
      if (targetType !== "post" && targetType !== "comment") {
        return json(400, { error: "targetType must be post or comment" });
      }
      if (!isUuid(targetId)) return json(400, { error: "Invalid target id" });
      if (![1, -1, 0].includes(value)) {
        return json(400, { error: "value must be 1, -1, or 0" });
      }

      if (targetType === "post") {
        const found = await sql`
          SELECT id FROM synk_community_posts WHERE id = ${targetId} LIMIT 1
        `;
        if (!found[0]) return json(404, { error: "Post not found" });
      } else {
        const found = await sql`
          SELECT id FROM synk_community_comments WHERE id = ${targetId} LIMIT 1
        `;
        if (!found[0]) return json(404, { error: "Comment not found" });
      }

      const result = await applyVote(sql, {
        profileId: auth.profile.id,
        targetType,
        targetId,
        value,
      });

      let score = 0;
      if (targetType === "post") {
        const rows = await sql`
          SELECT score FROM synk_community_posts WHERE id = ${targetId} LIMIT 1
        `;
        score = Number(rows[0] && rows[0].score) || 0;
      } else {
        const rows = await sql`
          SELECT score FROM synk_community_comments WHERE id = ${targetId} LIMIT 1
        `;
        score = Number(rows[0] && rows[0].score) || 0;
      }

      await logSynkEvent(sql, {
        eventType: "community_vote",
        profileId: auth.profile.id,
        ip,
        detail: `${targetType}:${targetId}:${result.next}`,
      });

      return json(200, {
        ok: true,
        targetType,
        targetId,
        myVote: result.next,
        score,
      });
    }

    if (action === "comment") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username before commenting" });
      }
      const postId = String(body.postId || body.post_id || "").trim();
      const parentIdRaw = String(body.parentId || body.parent_id || "").trim();
      const parentId = parentIdRaw && isUuid(parentIdRaw) ? parentIdRaw : null;
      const text = normalizePostBody(body.body || body.text || body.message);
      if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
      if (!text || text.length < 1) {
        return json(400, { error: "Comment cannot be empty" });
      }
      if (text.length < 2) {
        return json(400, { error: "Comment needs at least 2 characters" });
      }

      const persona = await resolvePostingPersona(
        sql,
        auth,
        role,
        body.asUsername || body.authorUsername || body.persona
      );
      if (!persona.ok) {
        return json(persona.status || 403, { error: persona.error || "Could not comment" });
      }

      const postRows = await sql`
        SELECT
          p.id,
          p.synk_profile_id,
          COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) AS author_username
        FROM synk_community_posts p
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        WHERE p.id = ${postId}
        LIMIT 1
      `;
      if (!postRows[0]) return json(404, { error: "Post not found" });

      let parent = null;
      if (parentId) {
        const parentRows = await sql`
          SELECT
            id,
            post_id,
            synk_profile_id,
            author_username
          FROM synk_community_comments
          WHERE id = ${parentId}
          LIMIT 1
        `;
        parent = parentRows[0] || null;
        if (!parent || String(parent.post_id) !== String(postId)) {
          return json(400, { error: "Parent comment not found on this post" });
        }
      }

      const rows = await sql`
        INSERT INTO synk_community_comments (
          post_id, synk_profile_id, parent_id, author_username, body, score
        )
        VALUES (
          ${postId},
          ${auth.profile.id},
          ${parentId},
          ${persona.username},
          ${text},
          1
        )
        RETURNING id, post_id, parent_id, body, score, created_at, author_username, synk_profile_id
      `;

      await sql`
        INSERT INTO synk_community_votes (synk_profile_id, target_type, target_id, value)
        VALUES (${auth.profile.id}, 'comment', ${rows[0].id}, 1)
        ON CONFLICT (synk_profile_id, target_type, target_id) DO UPDATE
        SET value = 1, created_at = NOW()
      `;

      const postAuthorId = postRows[0].synk_profile_id;
      if (postAuthorId && postAuthorId !== auth.profile.id) {
        await createNotification(sql, {
          profileId: postAuthorId,
          kind: parent ? "comment_reply_on_post" : "comment",
          actorUsername: persona.username,
          postId,
          commentId: rows[0].id,
          body: parent
            ? `${persona.username} replied on your post.`
            : `${persona.username} commented on your post.`,
        });
      }
      if (parent && parent.synk_profile_id && parent.synk_profile_id !== auth.profile.id) {
        await createNotification(sql, {
          profileId: parent.synk_profile_id,
          kind: "reply",
          actorUsername: persona.username,
          postId,
          commentId: rows[0].id,
          body: `${persona.username} replied to your comment.`,
        });
      }

      await logSynkEvent(sql, {
        eventType: "community_comment",
        profileId: auth.profile.id,
        ip,
        detail: `${postId}:${rows[0].id}`,
      });

      const comment = mapComment({
        ...rows[0],
        name: persona.isAlt ? "" : auth.profile.name,
        public_username: auth.profile.publicUsername,
        author_role: persona.isAlt ? null : role || null,
        is_alt: persona.isAlt,
        my_vote: 1,
      });
      comment.author.pinnedTag =
        (await getPinnedTagForUsername(sql, persona.username)) || null;

      return json(201, {
        ok: true,
        comment,
      });
    }

    if (action === "save") {
      const postId = String(body.postId || body.post_id || body.id || "").trim();
      if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
      const saved =
        body.saved === false || body.save === false || body.value === false
          ? false
          : body.saved === true ||
            body.save === true ||
            body.value === true ||
            body.saved == null;

      const found = await sql`
        SELECT id FROM synk_community_posts WHERE id = ${postId} LIMIT 1
      `;
      if (!found[0]) return json(404, { error: "Post not found" });

      if (saved) {
        await sql`
          INSERT INTO synk_community_saves (synk_profile_id, post_id)
          VALUES (${auth.profile.id}, ${postId})
          ON CONFLICT (synk_profile_id, post_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM synk_community_saves
          WHERE synk_profile_id = ${auth.profile.id}
            AND post_id = ${postId}
        `;
      }

      await logSynkEvent(sql, {
        eventType: saved ? "community_save" : "community_unsave",
        profileId: auth.profile.id,
        ip,
        detail: postId,
      });

      return json(200, { ok: true, postId, saved });
    }

    if (action === "hide") {
      const postId = String(body.postId || body.post_id || body.id || "").trim();
      if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
      const hidden =
        body.hidden === false || body.hide === false || body.value === false
          ? false
          : body.hidden === true ||
            body.hide === true ||
            body.value === true ||
            body.hidden == null;

      const found = await sql`
        SELECT id FROM synk_community_posts WHERE id = ${postId} LIMIT 1
      `;
      if (!found[0]) return json(404, { error: "Post not found" });

      if (hidden) {
        await sql`
          INSERT INTO synk_community_hides (synk_profile_id, post_id)
          VALUES (${auth.profile.id}, ${postId})
          ON CONFLICT (synk_profile_id, post_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM synk_community_hides
          WHERE synk_profile_id = ${auth.profile.id}
            AND post_id = ${postId}
        `;
      }

      await logSynkEvent(sql, {
        eventType: hidden ? "community_hide" : "community_unhide",
        profileId: auth.profile.id,
        ip,
        detail: postId,
      });

      return json(200, { ok: true, postId, hidden });
    }


    if (action === "create-group-role") {
      const group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) return json(404, { error: "Group not found" });
      const canManage =
        isCommunityStaffRole(role) ||
        (group.createdBy && String(group.createdBy) === String(auth.profile.id));
      if (!canManage) return json(403, { error: "Only group owners or community staff can manage roles" });
      // Explicitly ignore any icon/image fields — roles must not use icons (badge conflict).
      const result = await createGroupRole(sql, group.id, {
        name: body.name || body.title,
        color: body.color,
        sortOrder: body.sortOrder != null ? body.sortOrder : body.sort_order,
      });
      if (!result.ok) return json(400, { error: result.error || "Could not create role" });
      return json(200, {
        ok: true,
        role: result.role,
        roles: await listGroupRoles(sql, group.id),
      });
    }

    if (action === "update-group-role") {
      const group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) return json(404, { error: "Group not found" });
      const canManage =
        isCommunityStaffRole(role) ||
        (group.createdBy && String(group.createdBy) === String(auth.profile.id));
      if (!canManage) return json(403, { error: "Only group owners or community staff can manage roles" });
      const result = await updateGroupRole(sql, body.roleId || body.id, group.id, {
        name: body.name,
        color: body.color,
        sortOrder: body.sortOrder != null ? body.sortOrder : body.sort_order,
      });
      if (!result.ok) return json(400, { error: result.error || "Could not update role" });
      return json(200, {
        ok: true,
        role: result.role,
        roles: await listGroupRoles(sql, group.id),
      });
    }

    if (action === "delete-group-role") {
      const group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) return json(404, { error: "Group not found" });
      const canManage =
        isCommunityStaffRole(role) ||
        (group.createdBy && String(group.createdBy) === String(auth.profile.id));
      if (!canManage) return json(403, { error: "Only group owners or community staff can manage roles" });
      const result = await deleteGroupRole(sql, body.roleId || body.id, group.id);
      if (!result.ok) return json(400, { error: result.error || "Could not delete role" });
      return json(200, {
        ok: true,
        roles: await listGroupRoles(sql, group.id),
      });
    }

    if (action === "join") {
      const joined =
        body.joined === false || body.join === false || body.value === false
          ? false
          : body.joined === true ||
            body.join === true ||
            body.value === true ||
            body.joined == null;

      const group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id || body.id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) return json(404, { error: "Group not found" });

      if (joined) {
        await sql`
          INSERT INTO synk_community_memberships (synk_profile_id, group_id)
          VALUES (${auth.profile.id}, ${group.id})
          ON CONFLICT (synk_profile_id, group_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM synk_community_memberships
          WHERE synk_profile_id = ${auth.profile.id}
            AND group_id = ${group.id}
        `;
      }

      await logSynkEvent(sql, {
        eventType: joined ? "community_join" : "community_leave",
        profileId: auth.profile.id,
        ip,
        detail: group.slug,
      });

      const memberRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM synk_community_memberships
        WHERE group_id = ${group.id}
      `;
      const memberCount = Number(memberRows[0] && memberRows[0].count) || 0;

      return json(200, {
        ok: true,
        group: { ...group, joined, memberCount },
        joined,
        memberCount,
      });
    }

    if (action === "poll-vote") {
      const postId = String(body.postId || body.post_id || body.id || "").trim();
      const optionIndex = Number(body.optionIndex != null ? body.optionIndex : body.option);
      if (!isUuid(postId)) return json(400, { error: "Invalid post id" });
      if (!Number.isInteger(optionIndex) || optionIndex < 0) {
        return json(400, { error: "optionIndex must be a non-negative integer" });
      }

      const postRows = await sql`
        SELECT id, post_type, poll_options
        FROM synk_community_posts
        WHERE id = ${postId}
        LIMIT 1
      `;
      if (!postRows[0]) return json(404, { error: "Post not found" });
      if (String(postRows[0].post_type || "").toLowerCase() !== "poll") {
        return json(400, { error: "Post is not a poll" });
      }
      const options = parsePollOptions(postRows[0].poll_options) || [];
      if (optionIndex >= options.length) {
        return json(400, { error: "optionIndex is out of range" });
      }

      await sql`
        INSERT INTO synk_community_poll_votes (post_id, synk_profile_id, option_index)
        VALUES (${postId}, ${auth.profile.id}, ${optionIndex})
        ON CONFLICT (post_id, synk_profile_id) DO UPDATE
        SET option_index = EXCLUDED.option_index, created_at = NOW()
      `;

      await logSynkEvent(sql, {
        eventType: "community_poll_vote",
        profileId: auth.profile.id,
        ip,
        detail: `${postId}:${optionIndex}`,
      });

      const post = await loadPostById(sql, postId, auth.profile.id);
      await attachPinnedTagsToAuthors(sql, [post]);
      return json(200, {
        ok: true,
        postId,
        optionIndex,
        post,
      });
    }

    if (action === "mark-read" || action === "mark-notifications-read") {
      const ids = Array.isArray(body.ids)
        ? body.ids.map((id) => String(id || "").trim()).filter((id) => isUuid(id))
        : [];
      if (ids.length) {
        // Single/selected notifications: mark read (keep history).
        await sql`
          UPDATE synk_community_notifications
          SET read_at = NOW()
          WHERE synk_profile_id = ${auth.profile.id}
            AND id = ANY(${ids}::uuid[])
            AND read_at IS NULL
        `;
      } else {
        // "Clear all" / mark-all: remove every notification for this member.
        await sql`
          DELETE FROM synk_community_notifications
          WHERE synk_profile_id = ${auth.profile.id}
        `;
      }
      const notifications = await loadNotifications(sql, auth.profile.id, {
        username: primaryUsername,
      });
      const nextUnread = await getUnreadCount(sql, auth.profile.id);
      return json(200, {
        ok: true,
        notifications,
        unreadCount: nextUnread,
      });
    }

    if (action === "create-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can create tags" });
      }
      const name = normalizeTagName(body.name || body.title);
      const slug = normalizeTagSlug(body.slug || name);
      const description = normalizeTagDescription(body.description || body.about || "");
      const color = normalizeTagColor(body.color || "#6366f1") || "#6366f1";
      const learnMoreEnabled = body.learnMoreEnabled === true || body.learn_more_enabled === true;
      let learnMorePageId = body.learnMorePageId || body.learn_more_page_id || null;
      if (learnMorePageId) {
        const page = await findInfoPage(sql, { id: learnMorePageId });
        if (!page) return json(400, { error: "Learn more page not found" });
        learnMorePageId = page.id;
      } else {
        learnMorePageId = null;
      }
      if (!name || name.length < 2) {
        return json(400, { error: "Tag name needs at least 2 characters" });
      }
      if (!slug) return json(400, { error: "Tag name is invalid" });
      let iconUrl = null;
      try {
        if (body.iconData || body.icon || body.imageData) {
          iconUrl = await saveCommunityTagIcon(event, body.iconData || body.icon || body.imageData);
        } else if (body.iconUrl != null || body.icon_url != null) {
          const normalized = allowedTagIconUrl(body.iconUrl != null ? body.iconUrl : body.icon_url);
          if (normalized === undefined) {
            return json(400, { error: "Icon URL is invalid" });
          }
          iconUrl = normalized;
        }
      } catch (err) {
        return json(err.statusCode || 400, { error: err.message || "Could not save icon" });
      }
      try {
        const rows = await sql`
          INSERT INTO synk_community_tags (name, slug, description, color, icon_url, learn_more_enabled, learn_more_page_id, created_by)
          VALUES (${name}, ${slug}, ${description}, ${color}, ${iconUrl}, ${learnMoreEnabled}, ${learnMorePageId}, ${auth.profile.id})
          RETURNING id, name, slug, description, color, icon_url, learn_more_enabled, learn_more_page_id, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_tag_create",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(201, {
          ok: true,
          tag: serializeTagRow(rows[0], { pinned: false }),
          tags: await listCommunityTags(sql),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A tag with that name already exists" });
        }
        throw err;
      }
    }

    if (action === "update-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can edit tags" });
      }
      const existing = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.slug,
      });
      if (!existing) return json(404, { error: "Tag not found" });
      const name = normalizeTagName(body.name || body.title || existing.name);
      const slug = normalizeTagSlug(body.slug || name);
      const description = normalizeTagDescription(
        body.description != null ? body.description : existing.description
      );
      const color =
        normalizeTagColor(body.color != null ? body.color : existing.color) || existing.color;
      let learnMoreEnabled =
        body.learnMoreEnabled != null || body.learn_more_enabled != null
          ? body.learnMoreEnabled === true || body.learn_more_enabled === true
          : existing.learnMoreEnabled === true;
      let learnMorePageId =
        body.learnMorePageId !== undefined || body.learn_more_page_id !== undefined
          ? body.learnMorePageId || body.learn_more_page_id || null
          : existing.learnMorePageId || null;
      if (learnMorePageId) {
        const page = await findInfoPage(sql, { id: learnMorePageId });
        if (!page) return json(400, { error: "Learn more page not found" });
        learnMorePageId = page.id;
      } else {
        learnMorePageId = null;
      }
      if (!learnMoreEnabled) learnMorePageId = learnMorePageId; // keep linked page even if button off
      if (!name || name.length < 2) {
        return json(400, { error: "Tag name needs at least 2 characters" });
      }
      if (!slug) return json(400, { error: "Tag name is invalid" });
      let iconUrl = existing.iconUrl || null;
      try {
        if (body.clearIcon === true || body.removeIcon === true) {
          iconUrl = null;
        } else if (body.iconData || body.icon || body.imageData) {
          iconUrl = await saveCommunityTagIcon(event, body.iconData || body.icon || body.imageData);
        } else if (body.iconUrl !== undefined || body.icon_url !== undefined) {
          const incoming = body.iconUrl !== undefined ? body.iconUrl : body.icon_url;
          if (incoming == null || incoming === "") {
            iconUrl = null;
          } else {
            const normalized = allowedTagIconUrl(incoming);
            if (normalized === undefined) {
              return json(400, { error: "Icon URL is invalid" });
            }
            iconUrl = normalized;
          }
        }
      } catch (err) {
        return json(err.statusCode || 400, { error: err.message || "Could not save icon" });
      }
      try {
        const rows = await sql`
          UPDATE synk_community_tags
          SET
            name = ${name},
            slug = ${slug},
            description = ${description},
            color = ${color},
            icon_url = ${iconUrl},
            learn_more_enabled = ${learnMoreEnabled},
            learn_more_page_id = ${learnMorePageId},
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING id, name, slug, description, color, icon_url, learn_more_enabled, learn_more_page_id, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_tag_update",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(200, {
          ok: true,
          tag: serializeTagRow(rows[0], { pinned: false }),
          tags: await listCommunityTags(sql),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A tag with that name already exists" });
        }
        throw err;
      }
    }

    if (action === "delete-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can delete tags" });
      }
      const existing = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.slug,
      });
      if (!existing) return json(404, { error: "Tag not found" });
      await sql`DELETE FROM synk_community_tags WHERE id = ${existing.id}`;
      await logSynkEvent(sql, {
        eventType: "community_tag_delete",
        profileId: auth.profile.id,
        ip,
        detail: existing.slug,
      });
      return json(200, {
        ok: true,
        tags: await listCommunityTags(sql),
      });
    }

    if (action === "assign-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can assign tags" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const profileId = await findCommunityProfileIdByUsername(sql, username);
      const alt = profileId
        ? null
        : await findCommunityAltAccount(sql, { username });
      if (!profileId && !alt) {
        return json(404, { error: "No community member with that username" });
      }
      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      await assignUsernameTag(sql, username, tag.id, auth.profile.id);
      await logSynkEvent(sql, {
        eventType: "community_tag_assign",
        profileId: auth.profile.id,
        ip,
        detail: `${username}:${tag.slug}`,
      });
      return json(200, {
        ok: true,
        username,
        tags: await listUsernameTags(sql, username),
      });
    }

    if (action === "unassign-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove tags" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const profileId = await findCommunityProfileIdByUsername(sql, username);
      const alt = profileId ? null : await findCommunityAltAccount(sql, { username });
      if (!profileId && !alt) {
        return json(404, { error: "No community member with that username" });
      }
      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      await unassignUsernameTag(sql, username, tag.id);
      await logSynkEvent(sql, {
        eventType: "community_tag_unassign",
        profileId: auth.profile.id,
        ip,
        detail: `${username}:${tag.slug}`,
      });
      return json(200, {
        ok: true,
        username,
        tags: await listUsernameTags(sql, username),
      });
    }

    if (action === "pin-tag") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username first" });
      }
      const asUsername =
        normalizePublicUsername(body.asUsername || body.username || body.persona) ||
        auth.profile.publicUsername;
      // Members pin on their primary username; owner may pin on an owned alt.
      if (asUsername !== auth.profile.publicUsername) {
        if (role !== "owner") {
          return json(403, { error: "You can only pin tags on your own username" });
        }
        const alt = await findCommunityAltAccount(sql, {
          username: asUsername,
          ownerProfileId: auth.profile.id,
        });
        if (!alt) {
          return json(403, { error: "You can only pin tags on your own accounts" });
        }
      }

      const clearPin =
        body.tagId == null &&
        body.id == null &&
        !body.tag &&
        !body.slug &&
        (body.clear === true || body.pin === false || body.pinned === false);

      if (clearPin) {
        await setPinnedTagForUsername(sql, asUsername, null);
        await logSynkEvent(sql, {
          eventType: "community_tag_unpin",
          profileId: auth.profile.id,
          ip,
          detail: asUsername,
        });
        const tags = await listUsernameTags(sql, asUsername);
        // Keep me.tags as the primary account tags; persona tags are in `tags` + alts[].
        const primaryTags = primaryUsername
          ? await listUsernameTags(sql, primaryUsername)
          : [];
        const primaryPinned = primaryTags.find((tag) => tag.pinned) || null;
        if (alts.length) {
          for (const alt of alts) {
            alt.tags = await listUsernameTags(sql, alt.username);
            alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
          }
        }
        return json(200, {
          ok: true,
          username: asUsername,
          pinnedTag: null,
          tags,
          me: mePayload(auth, role, alts, primaryTags, primaryPinned),
        });
      }

      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      const owned = await sql`
        SELECT 1
        FROM synk_community_username_tags
        WHERE public_username = ${asUsername}
          AND tag_id = ${tag.id}
        LIMIT 1
      `;
      if (!owned[0]) {
        return json(403, { error: "You can only pin a tag assigned to you" });
      }
      await setPinnedTagForUsername(sql, asUsername, tag.id);
      await logSynkEvent(sql, {
        eventType: "community_tag_pin",
        profileId: auth.profile.id,
        ip,
        detail: `${asUsername}:${tag.slug}`,
      });
      const tags = await listUsernameTags(sql, asUsername);
      const pinnedTag = tags.find((item) => item.pinned) || null;
      const primaryTags = primaryUsername
        ? await listUsernameTags(sql, primaryUsername)
        : [];
      const primaryPinned = primaryTags.find((tag) => tag.pinned) || null;
      if (alts.length) {
        for (const alt of alts) {
          alt.tags = await listUsernameTags(sql, alt.username);
          alt.pinnedTag = alt.tags.find((tag) => tag.pinned) || null;
        }
      }
      return json(200, {
        ok: true,
        username: asUsername,
        pinnedTag,
        tags,
        me: mePayload(auth, role, alts, primaryTags, primaryPinned),
      });
    }

    
    if (action === "list-info-pages") {
      if (role !== "owner" && role !== "admin") {
        return json(403, { error: "Only staff can manage info pages" });
      }
      return json(200, { ok: true, pages: await listInfoPages(sql) });
    }

    if (action === "get-info-page") {
      const page = await findInfoPage(sql, {
        id: body.pageId || body.id,
        slug: body.slug || body.pageSlug,
      });
      if (!page) return json(404, { error: "Page not found" });
      return json(200, { ok: true, page });
    }

    if (action === "create-info-page" || action === "update-info-page") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can edit info pages" });
      }
      const title = normalizePageTitle(body.title || body.name);
      const slug = normalizePageSlug(body.slug || title);
      const summary = String(body.summary || body.description || "").trim().slice(0, 400);
      const heroImageUrl = String(body.heroImageUrl || body.hero_image_url || "").trim().slice(0, 800);
      const blocks = normalizePageBlocks(body.blocks || body.content || []);
      if (!title) return json(400, { error: "Page title is required" });
      if (!slug) return json(400, { error: "Page slug is invalid" });
      if (heroImageUrl && !(heroImageUrl.startsWith("/api/") || /^https?:\/\//i.test(heroImageUrl))) {
        return json(400, { error: "Hero image URL is invalid" });
      }
      if (action === "create-info-page") {
        try {
          const rows = await sql`
            INSERT INTO synk_info_pages (slug, title, summary, hero_image_url, blocks, created_by)
            VALUES (${slug}, ${title}, ${summary}, ${heroImageUrl}, ${JSON.stringify(blocks)}::jsonb, ${auth.profile.id})
            RETURNING id, slug, title, summary, hero_image_url, blocks, created_at, updated_at
          `;
          return json(201, { ok: true, page: mapInfoPage(rows[0]), pages: await listInfoPages(sql) });
        } catch (err) {
          if (String(err.message || "").includes("unique") || err.code === "23505") {
            return json(409, { error: "A page with that slug already exists" });
          }
          throw err;
        }
      }
      const existing = await findInfoPage(sql, { id: body.pageId || body.id, slug: body.currentSlug });
      if (!existing) return json(404, { error: "Page not found" });
      try {
        const rows = await sql`
          UPDATE synk_info_pages
          SET
            slug = ${slug},
            title = ${title},
            summary = ${summary},
            hero_image_url = ${heroImageUrl},
            blocks = ${JSON.stringify(blocks)}::jsonb,
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING id, slug, title, summary, hero_image_url, blocks, created_at, updated_at
        `;
        return json(200, { ok: true, page: mapInfoPage(rows[0]), pages: await listInfoPages(sql) });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A page with that slug already exists" });
        }
        throw err;
      }
    }

    if (action === "delete-info-page") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can delete info pages" });
      }
      const existing = await findInfoPage(sql, { id: body.pageId || body.id, slug: body.slug });
      if (!existing) return json(404, { error: "Page not found" });
      await sql`UPDATE synk_community_tags SET learn_more_page_id = NULL, updated_at = NOW() WHERE learn_more_page_id = ${existing.id}`;
      await sql`DELETE FROM synk_info_pages WHERE id = ${existing.id}`;
      return json(200, { ok: true, pages: await listInfoPages(sql) });
    }

    if (action === "beta-dashboard") {
      const profileId = auth.profile.id;
      const usernames = await sql`
        SELECT public_username FROM synk_community_profiles WHERE synk_profile_id = ${profileId}
        UNION
        SELECT public_username FROM synk_community_alt_accounts WHERE owner_synk_profile_id = ${profileId}
      `;
      let beta = false;
      for (const row of usernames) {
        const tags = await listUsernameTags(sql, row.public_username);
        if (tags.some(isBetaTesterTag)) { beta = true; break; }
      }
      if (!beta && role !== "owner" && role !== "admin") {
        return json(403, { error: "Beta testing is only for beta testers" });
      }
      const items = await sql`
        SELECT id, title, detail, sort_order, active, created_at, updated_at
        FROM synk_beta_agenda_items
        WHERE active = TRUE
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 100
      `;
      const checks = await sql`
        SELECT agenda_item_id, completed_at
        FROM synk_beta_agenda_checks
        WHERE synk_profile_id = ${profileId}
      `;
      const checkMap = new Map(checks.map((c) => [c.agenda_item_id, c.completed_at]));
      const feedback = await sql`
        SELECT id, body, created_at
        FROM synk_beta_feedback
        WHERE synk_profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return json(200, {
        ok: true,
        isBetaTester: true,
        agenda: items.map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.detail || "",
          sortOrder: item.sort_order,
          done: checkMap.has(item.id),
          completedAt: checkMap.get(item.id) || null,
        })),
        feedback: feedback.map((f) => ({
          id: f.id,
          body: f.body,
          createdAt: f.created_at,
        })),
      });
    }

    if (action === "beta-toggle-agenda") {
      const profileId = auth.profile.id;
      // access check reuse: any beta tag on profile usernames or staff
      const usernames = await sql`
        SELECT public_username FROM synk_community_profiles WHERE synk_profile_id = ${profileId}
        UNION
        SELECT public_username FROM synk_community_alt_accounts WHERE owner_synk_profile_id = ${profileId}
      `;
      let beta = role === "owner" || role === "admin";
      if (!beta) {
        for (const row of usernames) {
          const tags = await listUsernameTags(sql, row.public_username);
          if (tags.some(isBetaTesterTag)) { beta = true; break; }
        }
      }
      if (!beta) return json(403, { error: "Beta testing is only for beta testers" });
      const itemId = String(body.itemId || body.id || "").trim();
      if (!itemId) return json(400, { error: "Agenda item required" });
      const item = await sql`SELECT id FROM synk_beta_agenda_items WHERE id = ${itemId} AND active = TRUE LIMIT 1`;
      if (!item[0]) return json(404, { error: "Agenda item not found" });
      const done = body.done !== false && body.completed !== false;
      if (done) {
        await sql`
          INSERT INTO synk_beta_agenda_checks (agenda_item_id, synk_profile_id)
          VALUES (${itemId}, ${profileId})
          ON CONFLICT (agenda_item_id, synk_profile_id) DO UPDATE SET completed_at = NOW()
        `;
      } else {
        await sql`
          DELETE FROM synk_beta_agenda_checks
          WHERE agenda_item_id = ${itemId} AND synk_profile_id = ${profileId}
        `;
      }
      return json(200, { ok: true, itemId, done });
    }

    if (action === "beta-send-feedback") {
      const profileId = auth.profile.id;
      const usernames = await sql`
        SELECT public_username FROM synk_community_profiles WHERE synk_profile_id = ${profileId}
        UNION
        SELECT public_username FROM synk_community_alt_accounts WHERE owner_synk_profile_id = ${profileId}
      `;
      let beta = role === "owner" || role === "admin";
      if (!beta) {
        for (const row of usernames) {
          const tags = await listUsernameTags(sql, row.public_username);
          if (tags.some(isBetaTesterTag)) { beta = true; break; }
        }
      }
      if (!beta) return json(403, { error: "Beta testing is only for beta testers" });
      const bodyText = String(body.body || body.message || "").trim().replace(/\s+/g, " ").slice(0, 2000);
      if (bodyText.length < 3) return json(400, { error: "Write a bit more feedback" });
      const rows = await sql`
        INSERT INTO synk_beta_feedback (synk_profile_id, body)
        VALUES (${profileId}, ${bodyText})
        RETURNING id, body, created_at
      `;
      return json(201, {
        ok: true,
        feedback: { id: rows[0].id, body: rows[0].body, createdAt: rows[0].created_at },
      });
    }

    if (action === "beta-admin-agenda") {
      if (role !== "owner" && role !== "admin") {
        return json(403, { error: "Only staff can manage the beta agenda" });
      }
      const items = await sql`
        SELECT id, title, detail, sort_order, active, created_at, updated_at
        FROM synk_beta_agenda_items
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 200
      `;
      return json(200, {
        ok: true,
        agenda: items.map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.detail || "",
          sortOrder: item.sort_order,
          active: item.active !== false,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
      });
    }

    if (action === "beta-save-agenda-item") {
      if (role !== "owner" && role !== "admin") {
        return json(403, { error: "Only staff can manage the beta agenda" });
      }
      const title = String(body.title || "").trim().replace(/\s+/g, " ").slice(0, 160);
      const detail = String(body.detail || "").trim().slice(0, 1000);
      const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.round(Number(body.sortOrder)) : 0;
      const active = body.active !== false;
      const id = String(body.itemId || body.id || "").trim();
      if (!title) return json(400, { error: "Title is required" });
      if (id) {
        const rows = await sql`
          UPDATE synk_beta_agenda_items
          SET title = ${title}, detail = ${detail}, sort_order = ${sortOrder}, active = ${active}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, title, detail, sort_order, active, created_at, updated_at
        `;
        if (!rows[0]) return json(404, { error: "Agenda item not found" });
        return json(200, { ok: true, item: rows[0] });
      }
      const rows = await sql`
        INSERT INTO synk_beta_agenda_items (title, detail, sort_order, active, created_by)
        VALUES (${title}, ${detail}, ${sortOrder}, ${active}, ${auth.profile.id})
        RETURNING id, title, detail, sort_order, active, created_at, updated_at
      `;
      return json(201, { ok: true, item: rows[0] });
    }

    if (action === "beta-delete-agenda-item") {
      if (role !== "owner" && role !== "admin") {
        return json(403, { error: "Only staff can manage the beta agenda" });
      }
      const id = String(body.itemId || body.id || "").trim();
      if (!id) return json(400, { error: "Agenda item required" });
      await sql`DELETE FROM synk_beta_agenda_items WHERE id = ${id}`;
      return json(200, { ok: true });
    }

    if (action === "hub-feature-flags") {
      const profileId = auth.profile.id;
      const usernames = await sql`
        SELECT public_username FROM synk_community_profiles WHERE synk_profile_id = ${profileId}
        UNION
        SELECT public_username FROM synk_community_alt_accounts WHERE owner_synk_profile_id = ${profileId}
      `;
      let beta = false;
      for (const row of usernames) {
        const tags = await listUsernameTags(sql, row.public_username);
        if (tags.some(isBetaTesterTag)) { beta = true; break; }
      }
      return json(200, { ok: true, betaTester: beta });
    }


    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-community error:", err);
    return json(500, { error: "Server error" });
  }
};
