import { startServer } from "./server";

startServer().catch((error) => {
  console.error("Failed to start reception service", error);
  process.exit(1);
});
