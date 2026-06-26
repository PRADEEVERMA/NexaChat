import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { initializeSocket } from "./socket/index.js";

const server = http.createServer(app);

initializeSocket(server);

const startServer = async () => {
  await connectDB();

  server.listen(env.port, () => {
    console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
  });
};

startServer();

process.on("unhandledRejection", (error) => {
  console.error(`Unhandled rejection: ${error.message}`);
  server.close(() => process.exit(1));
});