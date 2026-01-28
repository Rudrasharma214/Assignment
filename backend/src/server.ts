import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { connectDB } from "./config/database";
import { registerPollSocket } from "./sockets/poll.socket";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",  
    }
  });

  registerPollSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
