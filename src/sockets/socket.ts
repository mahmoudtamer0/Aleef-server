let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
import { DefaultEventsMap, Server } from "socket.io";
import { verifyJWT } from "../utils/verifyJWT";
import chatSockets from "./chat.sockets";

export const initSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth["token"];
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        const decoded = verifyJWT(token)
        if (!decoded) {
            return next(new Error("Authentication error: Invalid token"));
        }

        (socket as any).user = decoded;
        next();
    });

    io.on("connection", (socket) => {
        socket.join((socket as any).user.id);
        console.log("A user connected: " + socket.id);
        chatSockets(io, socket);

        socket.on("disconnect", () => {
            console.log("A user disconnected: " + socket.id);
        });
    });

}