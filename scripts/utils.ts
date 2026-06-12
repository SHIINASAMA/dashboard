import { TwitterOpenApi } from "twitter-openapi-typescript";
import { TwitterApi } from 'twitter-api-v2';

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
}

export const _xClient = async (TOKEN: string) => {
//   console.log("🚀 ~ const_xClient= ~ TOKEN:", TOKEN)
  const proxy = getProxyUrl();
  const resp = await fetch("https://x.com/manifest.json", {
    headers: { cookie: `auth_token=${TOKEN}`, "User-Agent": "dashboard" },
    // @ts-ignore — Bun-specific options
    tls: { rejectUnauthorized: false },
    proxy: proxy,
  });
  if (!resp.ok) throw new Error(`x.com manifest: ${resp.status}`);

  const resCookie = resp.headers.getSetCookie?.() ?? [];
  const cookieObj = resCookie.reduce((acc: Record<string, string>, cookie: string) => {
    const [name, value] = cookie.split(";")[0].split("=");
    acc[name] = value;
    return acc;
  }, {});

//   console.log("🚀 ~ cookieObj ~ cookieObj:", JSON.stringify(cookieObj, null, 2))

  const api = new TwitterOpenApi();
  const client = await api.getClientFromCookies({...cookieObj, auth_token: TOKEN});
  return client;
};

export const xGuestClient = () => _xClient(process.env.GET_ID_X_TOKEN!);
export const XAuthClient = () => _xClient(process.env.AUTH_TOKEN!);


export const login = async (AUTH_TOKEN: string) => {
  const proxy = getProxyUrl();
  const resp = await fetch("https://x.com/manifest.json", {
    headers: { cookie: `auth_token=${AUTH_TOKEN}`, "User-Agent": "dashboard" },
    // @ts-ignore — Bun-specific options
    tls: { rejectUnauthorized: false },
    proxy: proxy,
  });
  if (!resp.ok) throw new Error(`x.com manifest: ${resp.status}`);

  const resCookie = resp.headers.getSetCookie?.() ?? [];
  const cookie = resCookie.reduce((acc: Record<string, string>, cookie: string) => {
    const [name, value] = cookie.split(";")[0].split("=");
    acc[name] = value;
    return acc;
  }, {});
  cookie.auth_token = AUTH_TOKEN;

  const api = new TwitterOpenApi();
  const client = await api.getClientFromCookies(cookie);

  const plugin = {
    onBeforeRequest: async (params: any) => {
      params.computedParams.headers = {
        ...params.computedParams.headers,
        ...client.config.apiKey,
        'x-csrf-token': cookie.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        authorization: `Bearer ${TwitterOpenApi.bearer}`,
        cookie: api.cookieEncode(cookie),
      };
      params.requestOptions.headers = {
        ...params.requestOptions.headers,
        ...client.config.apiKey,
        'x-csrf-token': cookie.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        authorization: `Bearer ${TwitterOpenApi.bearer}`,
        cookie: api.cookieEncode(cookie),
      };
    },
  };

  const legacy = new TwitterApi('_', { plugins: [plugin] });

  return { client, legacy };
}
