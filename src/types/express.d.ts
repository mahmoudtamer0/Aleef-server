import { Types } from "mongoose";


export type Role = "ADMIN" | "USER" | "DOCTOR" | "MODERATOR";

declare global {
    namespace Express {
        interface UserPayload {
            id: Types.ObjectId;
            name: string;
            role: Role;
            sessionId: Types.ObjectId;
        }

        interface Request {
            user?: UserPayload;
        }
    }
}
export { };