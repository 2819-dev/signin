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
  getDmThreadById,
  listDmMessages,
  sendDm,
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
    createdAt: row.created_at,
    group: row.group_slug
      ? {
          id: row.group_id,
          slug: row.group_slug,
          name: row.group_name || row.group_slug,
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

function mapNotification(row) {
  return {
    id: row.id,
    kind: row.kind,
    actorUsername: row.actor_username || null,
    postId: row.post_id || null,
    commentId: row.comment_id || null,
    body: row.body || "",
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

function mePayload(auth, role, alts = [], tags = [], pinnedTag = null) {
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
    alts: role === "owner" ? alts : [],
    tags: tags || [],
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
        notes.unshift({
          id: `friend-req-${row.id}`,
          kind: "friend_request",
          actorUsername: row.requester_username,
          postId: null,
          commentId: null,
          body: `${row.requester_username} sent you a friend request`,
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
    authorUsername = null,
    profileId = null,
    joinedOnly = false,
    savedOnly = false,
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
        WHERE (${groupId}::uuid IS NULL OR p.group_id = ${groupId})
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
        WHERE (${groupId}::uuid IS NULL OR p.group_id = ${groupId})
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: Boolean(pinned),
  };
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

      const profileUsername = normalizePublicUsername(qs.user || qs.username || qs.u || "");
      const groupSlug = normalizeGroupSlug(qs.group || qs.slug || "");
      const feed = String(qs.feed || "").trim().toLowerCase();
      const sort = String(qs.sort || "").trim().toLowerCase() || "new";

      let activeGroup = null;
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
        });
      } else if (feed === "home") {
        const joined = await listJoinedGroupIdSet(sql, auth.profile.id);
        posts = await loadPosts(sql, {
          profileId: auth.profile.id,
          joinedOnly: joined.size > 0,
          sort,
        });
      } else {
        if (groupSlug) {
          activeGroup = await findCommunityGroup(sql, { slug: groupSlug });
          if (!activeGroup) return json(404, { error: "Group not found" });
          activeGroup = {
            ...activeGroup,
            joined: (await listJoinedGroupIdSet(sql, auth.profile.id)).has(
              String(activeGroup.id)
            ),
          };
        }
        posts = await loadPosts(sql, {
          groupId: activeGroup ? activeGroup.id : null,
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
            body: `${primaryUsername} sent you a friend request`,
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
            body: `${primaryUsername} accepted your friend request`,
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
          INSERT INTO synk_community_groups (slug, name, description, created_by)
          VALUES (${slug}, ${name}, ${description}, ${auth.profile.id})
          RETURNING id, slug, name, description, created_by, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_group_create",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(201, {
          ok: true,
          group: {
            id: rows[0].id,
            slug: rows[0].slug,
            name: rows[0].name,
            description: rows[0].description || "",
            createdBy: rows[0].created_by,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            postCount: 0,
            joined: false,
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
        group = await findCommunityGroup(sql, { slug: "general" });
      }
      if (!group) {
        return json(400, { error: "Pick a group to post in" });
      }

      const pollJson = pollOptions ? JSON.stringify(pollOptions) : null;
      const rows = await sql`
        INSERT INTO synk_community_posts (
          synk_profile_id,
          group_id,
          title,
          post_type,
          body,
          link_url,
          image_url,
          poll_options,
          score,
          author_username
        )
        VALUES (
          ${auth.profile.id},
          ${group.id},
          ${title},
          ${postType},
          ${text || ""},
          ${linkUrl},
          ${imageUrl},
          ${pollJson}::jsonb,
          1,
          ${persona.username}
        )
        RETURNING
          id, title, post_type, body, link_url, image_url, poll_options,
          score, created_at, group_id, author_username
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
            ? `${persona.username} replied on your post`
            : `${persona.username} commented on your post`,
        });
      }
      if (parent && parent.synk_profile_id && parent.synk_profile_id !== auth.profile.id) {
        await createNotification(sql, {
          profileId: parent.synk_profile_id,
          kind: "reply",
          actorUsername: persona.username,
          postId,
          commentId: rows[0].id,
          body: `${persona.username} replied to your comment`,
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

      return json(200, {
        ok: true,
        group: { ...group, joined },
        joined,
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
        await sql`
          UPDATE synk_community_notifications
          SET read_at = NOW()
          WHERE synk_profile_id = ${auth.profile.id}
            AND id = ANY(${ids}::uuid[])
            AND read_at IS NULL
        `;
      } else {
        await sql`
          UPDATE synk_community_notifications
          SET read_at = NOW()
          WHERE synk_profile_id = ${auth.profile.id}
            AND read_at IS NULL
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
          INSERT INTO synk_community_tags (name, slug, description, color, icon_url, created_by)
          VALUES (${name}, ${slug}, ${description}, ${color}, ${iconUrl}, ${auth.profile.id})
          RETURNING id, name, slug, description, color, icon_url, created_at, updated_at
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
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING id, name, slug, description, color, icon_url, created_at, updated_at
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

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-community error:", err);
    return json(500, { error: "Server error" });
  }
};
