import { Hono } from "hono";
import { getTweets, getTweetById } from "../db";

function parseAccountIds(c: any): number[] | undefined {
  const raw = c.req.query("accountIds");
  if (!raw) return undefined;
  return raw.split(",").map(Number).filter(Boolean);
}

const tweetsRouter = new Hono();

tweetsRouter.get("/", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  const sort = c.req.query("sort") || "created_at";
  const order = c.req.query("order") || "desc";
  const search = c.req.query("search");
  const accountIds = parseAccountIds(c);
  const isReplyParam = c.req.query("isReply");
  const isReply = isReplyParam !== undefined ? Number(isReplyParam) : undefined;

  const data = await getTweets(page, limit, sort, order, search, accountIds, isReply);
  return c.json(data);
});

tweetsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const tweet = await getTweetById(id);
  if (!tweet) return c.json({ error: "Not found" }, 404);
  return c.json(tweet);
});

export default tweetsRouter;
