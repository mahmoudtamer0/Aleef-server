let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
import { DefaultEventsMap, Server } from "socket.io";
import { verifyJWT } from "../utils/verifyJWT";
import chatSockets from "./chat.sockets";
import chatBotSockets from "./chatBot.sockets";

export const initSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth["token"];
        if (!token) return next(new Error("No token"));

        const decoded = verifyJWT(token);
        if (!decoded) return next(new Error("Invalid token"));

        (socket as any).user = decoded;
        next();
    });

    io.on("connection", (socket) => {
        console.log("Socket connected :", socket.id);
        socket.join(`user:${(socket as any).user.id}`);

        chatSockets(io, socket);
        chatBotSockets(io, socket);

        socket.on("disconnect", () => {
            (socket as any).currentChat = null;
        });
    });
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket not initialized yet");
    }
    return io;
};