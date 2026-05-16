import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: "polar_oat_26LuveyAjQRugA3b4FvKsRcntqIKX6fNWqMHE0Xf0yU",
  server: "sandbox",
});

async function run() {
  try {
    const session = await polar.customerPortal.sessions.create({
      customerId: "2d30e0c6-2e19-425d-951e-eaefa43c3190",
    });
    console.log("Success:", session);
  } catch (error) {
    console.error("Error creating portal session:", error);
  }
}

run();
