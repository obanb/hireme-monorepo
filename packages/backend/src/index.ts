import { startServer } from "./server";

startServer().catch((error) => {
  console.error("Failed to start backend service", error);
  process.exit(1);
});
