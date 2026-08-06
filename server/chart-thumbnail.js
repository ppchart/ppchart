const crypto = require("crypto");

const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_SIGNATURE = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
]);

function createPublicError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parsePngDataUrl(dataUrl) {
  if (
    typeof dataUrl !== "string" ||
    !dataUrl.startsWith(PNG_DATA_URL_PREFIX)
  ) {
    throw createPublicError("缩略图必须是 PNG", 400);
  }

  const encoded = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  if (
    !encoded ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    throw createPublicError("缩略图 Base64 无效", 400);
  }

  const padding = encoded.endsWith("==")
    ? 2
    : encoded.endsWith("=")
    ? 1
    : 0;
  const decodedBytes = (encoded.length * 3) / 4 - padding;
  if (decodedBytes > MAX_THUMBNAIL_BYTES) {
    throw createPublicError("缩略图不能超过 3 MB", 400);
  }

  const png = Buffer.from(encoded, "base64");
  if (
    png.length < PNG_SIGNATURE.length ||
    !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw createPublicError("缩略图 PNG 内容无效", 400);
  }

  return png;
}

function createOssClient() {
  const required = [
    "OSS_ACCESS_KEY_ID",
    "OSS_ACCESS_KEY_SECRET",
    "OSS_BUCKET",
    "OSS_REGION",
  ];
  if (required.some((key) => !process.env[key])) {
    throw createPublicError("缩略图存储配置缺失", 503);
  }

  const OSS = require("ali-oss");
  return new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    secure: true,
  });
}

async function uploadChartThumbnail({
  cid,
  png,
  client,
  publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL,
}) {
  if (
    typeof cid !== "string" ||
    !/^user-[A-Za-z0-9-]+$/.test(cid)
  ) {
    throw createPublicError("图表 CID 无效", 400);
  }
  if (!Buffer.isBuffer(png)) {
    throw createPublicError("缩略图 PNG 内容无效", 400);
  }
  if (!publicBaseUrl) {
    throw createPublicError("缩略图存储配置缺失", 503);
  }

  const objectKey = `thumbnails/user/${cid}.png`;
  try {
    const ossClient = client || createOssClient();
    await ossClient.put(objectKey, png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    if (error.status === 400) {
      throw error;
    }
    throw createPublicError("缩略图上传失败", 503);
  }

  const contentVersion = crypto
    .createHash("sha256")
    .update(png)
    .digest("hex")
    .slice(0, 12);
  return `${publicBaseUrl.replace(
    /\/+$/,
    ""
  )}/${objectKey}?v=${contentVersion}`;
}

module.exports = {
  MAX_THUMBNAIL_BYTES,
  parsePngDataUrl,
  uploadChartThumbnail,
};
