const Koa = require("koa");
const _ = require("lodash");
var cors = require("koa2-cors");
const Redis = require("ioredis");
const Router = require("koa-router");
const jwtDecode = require("jwt-decode");
const envConfig = require("./env.config");

const getmac = require("getmac").default;

const { chart, mac: macModel, blackModel } = require("./source");
const { isString, isNumber } = require("lodash");
const { NodeClient } = require("ciam-node-sdk");

const ciam = new NodeClient({
  clientId: process.env.CIAM_ID,
  clientSecret: process.env.CIAM_SECRET,
  userDomain: "https://ppchart.portal.tencentciam.com",
  redirectUri: process.env.CIAM_REDIRECT,
  logoutRedirectUrl: process.env.CIAM_LOGOUT_REDIRECT,
  scopes: ["openid"],
  protocol: "OIDC_PKCE",
});
const clientPath = process.env.CLIENT_PATH;
const app = new Koa();
const router = new Router();
const pathRouter = new Router();

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
      let url = isString(ctx.header.referer)
        ? ctx.header.referer.substr(0, ctx.header.referer.length - 1)
        : null;
      if (whiteList.includes(url)) {
        return url; // 注意，这里域名末尾不能带/，否则不成功，所以在之前我把/通过substr干掉了
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

pathRouter.get("/login", async (ctx) => {
  const url = await ciam.generateAuthUrl();
  ctx.redirect(url);
});

pathRouter.get("/callback", async (ctx) => {
  const { code } = ctx.query;
  const result = await ciam.fetchToken(code);
  const { access_token, id_token } = result;

  await redis.set(`token::${access_token}`, id_token, "EX", 7200);
  ctx.redirect(`${clientPath}/#/callback?ticket=${access_token}`);
});

router.get("/logout", async (ctx) => {
  const access_token = ctx.headers["x-auth-token"];
  await redis
    .del(`token::${access_token}`)
    .then(async () => {
      const url = await ciam.logout();
      ctx.body = { code: 0, data: url };
    })
    .catch(() => {
      ctx.body = { code: 1, data: null };
    });
});

router.get("/userinfo", async (ctx) => {
  const access_token = ctx.headers["x-auth-token"];
  let data = {};
  await redis
    .get(`token::${access_token}`)
    .then(async (id_token) => {
      if (id_token) {
        const userInfo = jwtDecode(id_token);
        data.userName = userInfo.userName;
      } else {
        data = null;
      }
    })
    .catch(() => {
      data = null;
    });
  ctx.body = { code: 0, data };
});

app.use(router.routes()).use(router.allowedMethods());
app.use(pathRouter.routes()).use(pathRouter.allowedMethods());

app.listen(7777, "0.0.0.0", () => {
  console.log("http://localhost:7777");
});
