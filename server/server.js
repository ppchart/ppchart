const Koa = require("koa");
const _ = require("lodash");
var cors = require("koa2-cors");
const Redis = require("ioredis");
const Router = require("koa-router");
const envConfig = require("./env.config");
const {
  buildAuthorizeUrl,
  createSessionToken,
  createState,
  exchangeCode,
  fetchOAuthProfile,
  providerConfigs,
} = require("./oauth");
const {
  buildPublicChartData,
  buildReviewUpdate,
  parseReviewInput,
} = require("./chart-review");

const getmac = require("getmac").default;

const { chart, mac: macModel, blackModel, oauthUser, userChart } = require("./source");
const { isString, isNumber } = require("lodash");
const clientPath = process.env.CLIENT_PATH;
const app = new Koa();
const router = new Router();

app.use(
  cors({
    origin: (ctx) => {
      const whiteList = [
        "https://asset.ppchart.com",
        "http://asset.ppchart.com",
        "http://local.ppchart.com",
        "http://ppchart.com",
        "http://www.ppchart.com",
        "https://www.ppchart.com",
        "https://ppchart.com",
      ]; //可跨域白名单
      const requestOrigin = ctx.get("Origin");
      if (whiteList.includes(requestOrigin)) {
        return requestOrigin;
      }

      if (isString(ctx.header.referer)) {
        try {
          const refererOrigin = new URL(ctx.header.referer).origin;
          if (whiteList.includes(refererOrigin)) {
            return refererOrigin;
          }
        } catch (error) {
          // Ignore malformed Referer and use the local fallback below.
        }
      }
      return "http://local.ppchart.com:3000"; // 默认允许本地请求可跨域
    },
  })
);

const redis = new Redis({
  port: 28630,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_NO,
});

const limitNumberShort = 50;
const limitNumberLong = 666;

app.proxy = true;

async function parseJsonBody(ctx, next) {
  const method = ctx.method.toUpperCase();
  const contentType = ctx.get("content-type") || "";
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || !contentType.includes("application/json")) {
    return next();
  }

  const chunks = [];
  for await (const chunk of ctx.req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  ctx.request.body = rawBody ? JSON.parse(rawBody) : {};
  return next();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    provider: user.provider,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  };
}

function getAuthToken(ctx) {
  const auth = ctx.get("authorization");
  if (auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length);
  }
  return ctx.get("x-auth-token") || "";
}

async function getSessionUser(ctx) {
  const token = getAuthToken(ctx);
  if (!token) {
    return null;
  }
  const userId = await redis.get(`session::${token}`);
  if (!userId) {
    return null;
  }
  return oauthUser.findFirst({ where: { id: Number(userId) } });
}

async function requireUser(ctx) {
  const user = await getSessionUser(ctx);
  if (!user) {
    ctx.status = 401;
    ctx.body = { code: 401, message: "请先登录" };
    return null;
  }
  return user;
}

async function requireAdmin(ctx) {
  const user = await requireUser(ctx);
  if (!user) {
    return null;
  }
  if (user.role !== "admin") {
    ctx.status = 403;
    ctx.body = { code: 403, message: "无管理员权限" };
    return null;
  }
  return user;
}

function redirectWithToken(redirect, token) {
  const target = redirect || clientPath || "https://www.ppchart.com";
  const separator = target.includes("#") ? "&" : "#";
  return `${target}${separator}auth_token=${encodeURIComponent(token)}`;
}

function createUserChartCid(userId) {
  return `user-${userId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChartPayload(body = {}) {
  return {
    title: isString(body.title) && body.title.trim() ? body.title.trim().slice(0, 255) : "未命名图表",
    description: isString(body.description) ? body.description.trim() : "",
    code: isString(body.code) ? body.code : "",
    echartsVersion: isString(body.echartsVersion) && body.echartsVersion.trim() ? body.echartsVersion.trim() : null,
    status: body.status === "pending" ? "pending" : "draft",
    reviewNote: null,
    reviewedAt: null,
    reviewerUserId: null,
  };
}

async function invalidatePublicChartCache(cid) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "chart-list:*",
      "COUNT",
      100
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
  await redis.del(`chart-detail:${cid}`);
}

app.use(parseJsonBody);

app.use(async (ctx, next) => {
  ctx.body = { code: 10086, message: "大兄弟，咱慢点访问" };
  const ipLimit = () => {
    ctx.body = { code: 10086, message: "大兄弟，咱慢点访问" };
  };
  const mac = ctx.request.ip;
  const blackItem = await blackModel.findFirst({
    where: { mac: { contains: mac.split(".").slice(0, 3).join(".") } },
  });
  if (blackItem) {
    return ipLimit();
  }
  const shortId = `mac_short::${mac}`;
  const longId = `mac_long::${mac}`;
  const macItem = await macModel.recordVisit(mac);
  if (macItem.id === 1) {
    return await next();
  }
  if (macItem.black) {
    return ipLimit();
  }

  await redis
    .get(shortId)
    .then(async (data) => {
      const shortNumber = data || 0;
      if (shortNumber > limitNumberShort)
        throw new Error(`short,big than ${limitNumberShort}`);
      redis.incr(shortId).then((count) => {
        count === 1 && redis.expire(shortId, 60);
      });
      return redis.get(longId);
    })
    .then(async (data) => {
      const longNumber = data || 0;
      if (longNumber > limitNumberLong) {
        await macModel.updateBlack(mac);
        throw new Error(`long,big than ${limitNumberLong}`);
      }
      redis.incr(longId).then((count) => {
        count === 1 && redis.expire(longId, 86400);
      });
      await next();
    })
    .catch((error) => {
      if (error.message && error.message.includes("long")) {
        return ipLimit();
      }
      return;
    });
});

router.prefix("/api");
const typeMap = {
  2: "series-line",
  3: "series-pie",
  4: "series-bar",
  5: "series-map", // 地图
  6: "series-wordCloud", // 词云
  7: "series-graph", // 关系图
  8: "series-pictorialBar", // 象形柱图
  9: "series-radar", // 雷达图
  10: "series-treemap", // 矩树图
  11: "series-funnel", // 漏斗图
  12: "series-themeRiver", // 河流图
  13: "series-lines", // 路径图
  14: "series-candlestick", // K 线图
  15: "series-tree", // 树状图
  16: "series-sunburst", // 旭日图
  17: "series-parallel", // 平行坐标系
  18: "series-liquidFill", // 水球
  19: "series-scatter", // 散点图
  20: "series-sankey", // 桑吉图
  21: "series-gauge", // 仪表盘
  22: "series-boxplot", // 盒须图
  23: "series-heatmap", // 热力图
};
const betaType = "beta";
const runnableChartTagName = "ppchart-runnable-beta";
router.get("/chart-list", async (ctx) => {
  const { current, type, search, runtime } = ctx.query;

  ctx.body = { code: 10010, message: "嚯，这错的参数咱可不兴应呀" };

  if (isNaN(current)) return;
  if (parseInt(current) <= 0) return;

  const requestId = `chart-list:${current}-${type || ""}-${runtime || "all"}`;

  const filters = [];
  const runtimeFilter = runtime || (type === betaType ? "runnable" : "all");
  const chartType = type === betaType ? "" : type;
  const tagFilter = (name) => ({
    tags: {
      some: {
        tag: {
          name,
        },
      },
    },
  });

  if (Reflect.has(typeMap, chartType)) {
    filters.push(tagFilter(typeMap[chartType]));
  }

  if (runtimeFilter === "runnable") {
    filters.push(tagFilter(runnableChartTagName));
  } else if (runtimeFilter === "unrunnable") {
    filters.push({
      tags: {
        none: {
          tag: {
            name: runnableChartTagName,
          },
        },
      },
    });
  }

  let where = filters.length > 0 ? { AND: filters } : {};

  if (search && isString(search)) {
    const searchFilters = search
      .split(" ")
      .filter(Boolean)
      .map((item) => ({ title: { contains: item } }));
    where.AND = [...(where.AND || []), ...searchFilters];
    chartList = await chart
      .findMany({
        current: parseInt(current),
        pageSize: 20,
        conditions: {
          select: {
            cid: true,
            title: true,
            createTime: true,
            echartsVersion: true,
            viewCount: true,
            thumbnailURL: true,
            // tags: {
            //     select: {
            //         tag: true
            //     }
            // }
          },
          where,
          orderBy: type == 1 ? undefined : { viewCount: "desc" },
        },
      })
      .catch(() => {
        return [];
      });
    const total = await chart.getCount({ where });
    ctx.body = { chartList, code: 0, fromCache: false, total };
    return;
  }

  await redis
    .get(requestId)
    .then(async (data) => {
      const total = await chart.getCount({ where });
      let chartList = [];
      if (data) {
        chartList = JSON.parse(data);
      } else {
        chartList = await chart
          .findMany({
            current: parseInt(current),
            pageSize: 20,
            conditions: {
              select: {
                cid: true,
                title: true,
                createTime: true,
                echartsVersion: true,
                viewCount: true,
                thumbnailURL: true,
                // tags: {
                //     select: {
                //         tag: true
                //     }
                // }
              },
              where,
              orderBy: type == 1 ? undefined : { viewCount: "desc" },
            },
          })
          .then((data) => {
            redis
              .set(requestId, JSON.stringify(data), "EX", 43200)
              .catch((error) => {
                console.log(error);
              });
            return data;
          })
          .catch((error) => {
            console.log(error);
            return [];
          });
      }
      // 设置过期时间为 30 秒后
      ctx.set("Cache-Control", "max-age=6666");
      ctx.body = { chartList, code: 0, fromCache: !!data, total };
    })
    .catch(async (error) => {
      ctx.body = { code: 10010, message: error.message || "get error" };
    });
});

router.get("/chart-detail", async (ctx) => {
  const { cid } = ctx.query;

  ctx.body = { code: 10010, message: "嚯，这错的参数咱可不兴应呀" };

  if (!isString(cid)) return;

  const requestId = `chart-detail:${cid}`;

  await redis
    .get(requestId)
    .then(async (data) => {
      let chartDetail = {};
      if (data) {
        chartDetail = JSON.parse(data);
      } else {
        chartDetail = await chart
          .findFirst({
            where: { cid },
            select: {
              cid: true,
              title: true,
              createTime: true,
              echartsVersion: true,
              viewCount: true,
              code: true,
            },
          })
          .then(async (data) => {
            if (!data) {
              return {};
            }
            await chart.addCount(cid);
            ctx.set("Cache-Control", "max-age=6666");
            redis
              .set(requestId, JSON.stringify(data), "EX", 43200)
              .catch((error) => {
                console.log(error);
              });
            return data;
          })
          .catch((error) => {
            console.log(error);
            return {};
          });
      }
      ctx.body = { chartDetail, code: 0, fromCache: !!data };
    })
    .catch(async (error) => {
      ctx.body = { code: 10010, message: error.message || "get error" };
    });
});

router.get("/visit", async (ctx) => {
  let visitNumber = { online: 0, threeUV: 0, UV: 0 };
  await redis
    .keys("mac_short*")
    .then(async (data) => {
      visitNumber.online = Array.isArray(data) ? data.length : 0;
      return redis.keys("mac_long*");
    })
    .then(async (data) => {
      visitNumber.threeUV = Array.isArray(data) ? data.length : 0;
      return macModel.getCount();
    })
    .then(async (data) => {
      visitNumber.UV = isNumber(data) ? data : 0;
    })
    .catch(() => {
      visitNumber.online = 0;
      visitNumber.threeUV = 0;
      visitNumber.UV = 0;
    });
  ctx.body = { code: 0, ...visitNumber };
});

router.get("/oauth/:provider/login", async (ctx) => {
  const { provider } = ctx.params;
  if (!providerConfigs[provider]) {
    ctx.status = 404;
    ctx.body = { code: 404, message: "登录方式不存在" };
    return;
  }

  const state = createState();
  const redirect = isString(ctx.query.redirect) ? ctx.query.redirect : clientPath;
  await redis.set(`oauth_state::${state}`, JSON.stringify({ provider, redirect }), "EX", 600);
  ctx.redirect(buildAuthorizeUrl(provider, state));
});

router.get("/oauth/:provider/callback", async (ctx) => {
  const { provider } = ctx.params;
  const { code, state } = ctx.query;

  if (!providerConfigs[provider] || !isString(code) || !isString(state)) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "OAuth 回调参数错误" };
    return;
  }

  const stateKey = `oauth_state::${state}`;
  const stateValue = await redis.get(stateKey);
  await redis.del(stateKey);
  if (!stateValue) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "OAuth state 已过期" };
    return;
  }

  const statePayload = JSON.parse(stateValue);
  if (statePayload.provider !== provider) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "OAuth provider 不匹配" };
    return;
  }

  const accessToken = await exchangeCode(provider, code);
  const profile = await fetchOAuthProfile(provider, accessToken);
  const existingUser = await oauthUser.findByProviderUser(profile.provider, profile.providerUserId);
  const user = existingUser
    ? await oauthUser.update({
        where: { id: existingUser.id },
        data: {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        },
      })
    : await oauthUser.add({
        data: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        },
      });

  const sessionToken = createSessionToken();
  await redis.set(`session::${sessionToken}`, String(user.id), "EX", 60 * 60 * 24 * 7);
  ctx.redirect(redirectWithToken(statePayload.redirect, sessionToken));
});

router.get("/logout", async (ctx) => {
  const access_token = getAuthToken(ctx);
  await redis
    .del(`session::${access_token}`)
    .then(async () => {
      ctx.body = { code: 0, data: null };
    })
    .catch(() => {
      ctx.body = { code: 1, data: null };
    });
});

router.get("/userinfo", async (ctx) => {
  const user = await getSessionUser(ctx);
  ctx.body = { code: 0, data: publicUser(user) };
});

router.get("/my/charts", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const charts = await userChart.model.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      cid: true,
      title: true,
      description: true,
      code: true,
      echartsVersion: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      reviewNote: true,
      reviewedAt: true,
      reviewerUserId: true,
    },
  });
  ctx.body = { code: 0, data: charts };
});

router.post("/my/charts", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const payload = normalizeChartPayload(ctx.request.body);
  if (!payload.code.trim()) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "图表代码不能为空" };
    return;
  }

  const created = await userChart.add({
    data: {
      ...payload,
      userId: user.id,
      cid: createUserChartCid(user.id),
    },
  });
  ctx.body = { code: 0, data: created };
});

router.put("/my/charts/:id", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const id = Number(ctx.params.id);
  const existing = await userChart.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    ctx.status = 404;
    ctx.body = { code: 404, message: "图表不存在" };
    return;
  }
  if (existing.status === "pending") {
    ctx.status = 409;
    ctx.body = { code: 409, message: "图表审核中，暂时不能编辑" };
    return;
  }

  const payload = normalizeChartPayload(ctx.request.body);
  if (!payload.code.trim()) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "图表代码不能为空" };
    return;
  }

  const updated = await userChart.update({
    where: { id },
    data: payload,
  });
  ctx.body = { code: 0, data: updated };
});

router.delete("/my/charts/:id", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const id = Number(ctx.params.id);
  const existing = await userChart.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    ctx.status = 404;
    ctx.body = { code: 404, message: "图表不存在" };
    return;
  }
  if (existing.status === "pending" || existing.status === "published") {
    ctx.status = 409;
    ctx.body = { code: 409, message: "审核中或已发布图表不能直接删除" };
    return;
  }

  await userChart.model.delete({ where: { id } });
  ctx.body = { code: 0, data: null };
});

router.get("/admin/charts", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;

  const status = isString(ctx.query.status) ? ctx.query.status : "pending";
  if (!["pending", "published", "rejected"].includes(status)) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "审核状态无效" };
    return;
  }

  const charts = await userChart.model.findMany({
    where: { status },
    orderBy: { updatedAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          provider: true,
        },
      },
    },
  });
  ctx.body = { code: 0, data: charts };
});

router.post("/admin/charts/:id/review", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "图表 ID 无效" };
    return;
  }

  let reviewInput;
  try {
    reviewInput = parseReviewInput(ctx.request.body);
  } catch (error) {
    ctx.status = 400;
    ctx.body = { code: 400, message: error.message };
    return;
  }

  const existing = await userChart.model.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) {
    ctx.status = 404;
    ctx.body = { code: 404, message: "图表不存在" };
    return;
  }
  if (existing.status !== "pending") {
    ctx.status = 409;
    ctx.body = { code: 409, message: "图表已被审核" };
    return;
  }

  try {
    const reviewedChart = await userChart.transaction(async (tx) => {
      const reviewData = buildReviewUpdate(
        reviewInput.action,
        reviewInput.note,
        admin.id
      );
      const claimed = await tx.user_chart.updateMany({
        where: { id, status: "pending" },
        data: reviewData,
      });
      if (claimed.count !== 1) {
        const conflict = new Error("图表已被其他管理员审核");
        conflict.status = 409;
        throw conflict;
      }

      if (reviewInput.action === "approve") {
        const publicData = buildPublicChartData(existing);
        const {
          auth,
          cid,
          createTime,
          viewCount,
          ...publicUpdate
        } = publicData;
        await tx.chart.upsert({
          where: { cid },
          create: publicData,
          update: publicUpdate,
        });
      }

      return tx.user_chart.findUnique({ where: { id } });
    });

    if (reviewInput.action === "approve") {
      await invalidatePublicChartCache(existing.cid).catch((error) => {
        console.error("invalidate chart cache failed", error);
      });
    }
    ctx.body = { code: 0, data: reviewedChart };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      code: ctx.status,
      message: error.status ? error.message : "审核操作失败",
    };
  }
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(7777, "0.0.0.0", () => {
  console.log("http://localhost:7777");
});
