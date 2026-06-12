import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function run() {
  const users = await client.query("users:getAll", {});
  // wait, do we have users:getAll? Probably not public.
}
run();
