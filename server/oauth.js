const crypto = require("crypto");
const https = require("https");

const providerConfigs = {
  github: {
    authorizeURL: "https://github.com/login/oauth/authorize",
    tokenURL: "https://github.com/login/oauth/access_token",
    userURL: "https://api.github.com/user",
    emailsURL: "https://api.github.com/user/emails",
    scope: "read:user user:email",
  },
  google: {
    authorizeURL: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenURL: "https://oauth2.googleapis.com/token",
    userURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
  },
};

function getOAuthEnv(provider) {
  const prefix = provider.toUpperCase();
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
    redirectUri: process.env[`${prefix}_REDIRECT_URI`],
  };
}

function assertProvider(provider) {
  if (!providerConfigs[provider]) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

function createState() {
  return crypto.randomBytes(24).toString("hex");
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const request = https.request(
      {
        method: options.method || "GET",
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } : {}),
          ...(options.headers || {}),
        },
      },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let payload = {};
          try {
            payload = text ? JSON.parse(text) : {};
          } catch (error) {
            reject(new Error(`Invalid JSON response from ${parsed.hostname}`));
            return;
          }
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, payload });
        });
      }
    );
    request.on("error", reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function buildAuthorizeUrl(provider, state) {
  assertProvider(provider);
  const config = providerConfigs[provider];
  const env = getOAuthEnv(provider);

  if (!env.clientId || !env.clientSecret || !env.redirectUri) {
    throw new Error(`${provider} OAuth env is incomplete`);
  }

  const url = new URL(config.authorizeURL);
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }

  return url.toString();
}

async function exchangeCode(provider, code) {
  assertProvider(provider);
  const config = providerConfigs[provider];
  const env = getOAuthEnv(provider);
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    code,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await requestJson(config.tokenURL, {
    method: "POST",
    headers: {
    },
    body: body.toString(),
  });
  const payload = response.payload;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `${provider} token exchange failed`);
  }
  return payload.access_token;
}

async function fetchGitHubEmail(accessToken) {
  const response = await requestJson(providerConfigs.github.emailsURL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "PPChart",
    },
  });
  if (!response.ok) {
    return null;
  }
  const emails = response.payload;
  const primary = Array.isArray(emails)
    ? emails.find(item => item.primary && item.verified) || emails.find(item => item.verified)
    : null;
  return primary?.email || null;
}

async function fetchOAuthProfile(provider, accessToken) {
  assertProvider(provider);
  const response = await requestJson(providerConfigs[provider].userURL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "PPChart",
    },
  });
  const payload = response.payload;
  if (!response.ok) {
    throw new Error(payload.error_description || payload.message || `${provider} user fetch failed`);
  }

  if (provider === "github") {
    const email = payload.email || (await fetchGitHubEmail(accessToken));
    return {
      provider,
      providerUserId: String(payload.id),
      email,
      name: payload.name || payload.login,
      avatar: payload.avatar_url,
    };
  }

  return {
    provider,
    providerUserId: String(payload.sub),
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  };
}

module.exports = {
  buildAuthorizeUrl,
  createSessionToken,
  createState,
  exchangeCode,
  fetchOAuthProfile,
  getOAuthEnv,
  providerConfigs,
};
