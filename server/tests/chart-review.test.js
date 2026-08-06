const assert = require("assert");
const {
  buildPublicChartData,
  buildReviewUpdate,
  parseReviewInput,
} = require("../chart-review");

assert.deepStrictEqual(parseReviewInput({ action: "approve" }), {
  action: "approve",
  note: "",
});
assert.deepStrictEqual(
  parseReviewInput({ action: "reject", note: "  代码无法运行  " }),
  {
    action: "reject",
    note: "代码无法运行",
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
const publicChart = buildPublicChartData(sourceChart);
assert.strictEqual(publicChart.cid, sourceChart.cid);
assert.strictEqual(publicChart.title, sourceChart.title);
assert.strictEqual(publicChart.code, sourceChart.code);
assert.strictEqual(publicChart.viewCount, 0);
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

console.log("chart-review tests passed");
