function parseReviewInput(body = {}) {
  const action = body.action;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const thumbnail =
    typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";

  if (!["approve", "reject"].includes(action)) {
    throw new Error("审核动作无效");
  }
  if (action === "reject" && !note) {
    throw new Error("拒绝原因不能为空");
  }
  if (action === "approve" && !thumbnail) {
    throw new Error("缩略图不能为空");
  }

  return { action, note, thumbnail };
}

function buildPublicChartData(
  sourceChart,
  thumbnailURL,
  now = new Date()
) {
  return {
    cid: sourceChart.cid,
    title: sourceChart.title,
    description: sourceChart.description || "",
    code: sourceChart.code,
    echartsVersion: sourceChart.echartsVersion || null,
    createTime: now,
    lastUpdateTime: now,
    viewCount: 0,
    auth: 0,
    isCustomThumbnail: 1,
    thumbnailURL,
  };
}

function buildReviewUpdate(action, note, reviewerUserId, now = new Date()) {
  const common = {
    status: action === "approve" ? "published" : "rejected",
    reviewNote: action === "approve" ? null : note,
    reviewedAt: now,
    reviewerUserId,
  };

  return action === "approve"
    ? {
        ...common,
        publishedAt: now,
      }
    : common;
}

function parseUnpublishInput(body = {}) {
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) {
    throw new Error("下架原因不能为空");
  }
  return { note };
}

function buildUnpublishUpdate(note, reviewerUserId, now = new Date()) {
  return {
    status: "unpublished",
    reviewNote: note,
    reviewedAt: now,
    reviewerUserId,
  };
}

module.exports = {
  buildPublicChartData,
  buildReviewUpdate,
  buildUnpublishUpdate,
  parseReviewInput,
  parseUnpublishInput,
};
