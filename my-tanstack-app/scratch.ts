import { Polar } from "@polar-sh/sdk";
import fs from "fs";

const envStr = fs.readFileSync(".env.local", "utf-8");
const match = envStr.match(/POLAR_ACCESS_TOKEN=(.+)/);
const token = match ? match[1].trim() : "";

async function run() {
  const polar = new Polar({
    accessToken: token,
    server: "production",
  });

  try {
    const session = await polar.customerSessions.create({ customerId: "test" });
  } catch (err: any) {
    console.error("Status:", err.statusCode || err.status);
    console.error("Message:", err.message);
  }
}
run();
