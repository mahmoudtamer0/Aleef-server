import { Types } from "mongoose";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: Types.ObjectId;
                name: string,
                role: string
                sessionId: Types.ObjectId;
            };
        }
    }
}

export { };