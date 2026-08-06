const assert = require("assert");
const {
  MAX_THUMBNAIL_BYTES,
  parsePngDataUrl,
  uploadChartThumbnail,
} = require("../chart-thumbnail");

const validPng = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
]);
const validDataUrl = `data:image/png;base64,${validPng.toString("base64")}`;

assert.deepStrictEqual(parsePngDataUrl(validDataUrl), validPng);
assert.throws(
  () => parsePngDataUrl("data:image/jpeg;base64,AA=="),
  /PNG/
);
assert.throws(
  () => parsePngDataUrl("data:image/png;base64,%%%%"),
  /Base64/
);
assert.throws(
  () =>
    parsePngDataUrl(
      `data:image/png;base64,${Buffer.alloc(
        MAX_THUMBNAIL_BYTES + 1
      ).toString("base64")}`
    ),
  /3 MB/
);
assert.throws(
  () =>
    parsePngDataUrl(
      `data:image/png;base64,${Buffer.from("not png").toString("base64")}`
    ),
  /PNG/
);

async function run() {
  let captured;
  const result = await uploadChartThumbnail({
    cid: "user-1-demo",
    png: validPng,
    client: {
      put: async (key, body, options) => {
        captured = { key, body, options };
      },
    },
    publicBaseUrl: "https://ppchart.com/",
  });

  assert.strictEqual(
    captured.key,
    "thumbnails/user/user-1-demo.png"
  );
  assert.deepStrictEqual(captured.body, validPng);
  assert.strictEqual(
    captured.options.headers["Content-Type"],
    "image/png"
  );
  assert.strictEqual(
    captured.options.headers["Cache-Control"],
    "public, max-age=31536000"
  );
  assert.strictEqual(
    result,
    "https://ppchart.com/thumbnails/user/user-1-demo.png?v=843ac23b1736"
  );

  await assert.rejects(
    uploadChartThumbnail({
      cid: "../invalid",
      png: validPng,
      client: { put: async () => {} },
      publicBaseUrl: "https://ppchart.com",
    }),
    /CID/
  );

  await assert.rejects(
    uploadChartThumbnail({
      cid: "user-1-demo",
      png: validPng,
      client: {
        put: async () => {
          throw new Error("secret upstream detail");
        },
      },
      publicBaseUrl: "https://ppchart.com",
    }),
    (error) =>
      error.status === 503 &&
      error.message === "缩略图上传失败"
  );

  console.log("chart-thumbnail tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
