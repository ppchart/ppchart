const assert = require("assert");
const {
  buildPublicChartData,
  buildReviewUpdate,
  buildUnpublishUpdate,
  parseReviewInput,
  parseUnpublishInput,
} = require("../chart-review");

assert.throws(
  () => parseReviewInput({ action: "approve" }),
  /缩略图不能为空/
);
assert.deepStrictEqual(
  parseReviewInput({
    action: "approve",
    thumbnail: "data:image/png;base64,AA==",
  }),
  {
    action: "approve",
    note: "",
    thumbnail: "data:image/png;base64,AA==",
  }
);
assert.deepStrictEqual(
  parseReviewInput({ action: "reject", note: "  代码无法运行  " }),
  {
    action: "reject",
    note: "代码无法运行",
    thumbnail: "",
  }
);
assert.throws(
  () => parseReviewInput({ action: "reject", note: " " }),
  /拒绝原因不能为空/
);
assert.throws(
  () => parseReviewInput({ action: "delete" }),
  /审核动作无效/
);

const sourceChart = {
  cid: "user-1-demo",
  title: "Demo",
  description: "Desc",
  code: "option = {}",
  echartsVersion: "5.6.0",
};
const thumbnailURL =
  "https://ppchart.com/thumbnails/user/user-1-demo.png";
const publicChart = buildPublicChartData(sourceChart, thumbnailURL);
assert.strictEqual(publicChart.cid, sourceChart.cid);
assert.strictEqual(publicChart.title, sourceChart.title);
assert.strictEqual(publicChart.code, sourceChart.code);
assert.strictEqual(publicChart.viewCount, 0);
assert.strictEqual(publicChart.thumbnailURL, thumbnailURL);
assert.strictEqual(publicChart.isCustomThumbnail, 1);
assert.ok(publicChart.createTime instanceof Date);
assert.ok(publicChart.lastUpdateTime instanceof Date);

const approved = buildReviewUpdate("approve", "", 7);
assert.strictEqual(approved.status, "published");
assert.strictEqual(approved.reviewerUserId, 7);
assert.strictEqual(approved.reviewNote, null);
assert.ok(approved.reviewedAt instanceof Date);
assert.ok(approved.publishedAt instanceof Date);

const rejected = buildReviewUpdate("reject", "代码无法运行", 7);
assert.strictEqual(rejected.status, "rejected");
assert.strictEqual(rejected.reviewNote, "代码无法运行");
assert.strictEqual(rejected.publishedAt, undefined);

assert.deepStrictEqual(parseUnpublishInput({ note: "  内容违规  " }), {
  note: "内容违规",
});
assert.throws(
  () => parseUnpublishInput({ note: " " }),
  /下架原因不能为空/
);

const unpublished = buildUnpublishUpdate("内容违规", 7);
assert.strictEqual(unpublished.status, "unpublished");
assert.strictEqual(unpublished.reviewNote, "内容违规");
assert.strictEqual(unpublished.reviewerUserId, 7);
assert.ok(unpublished.reviewedAt instanceof Date);

console.log("chart-review tests passed");
