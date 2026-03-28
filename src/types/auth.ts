import { Request } from "express";
import { Types } from "mongoose";

export type Role = "USER" | "ADMIN" | "DOCTOR" | "MODERATOR";

export interface AuthRequest extends Request {
    user?: {
        id: Types.ObjectId;
        name: string;
        role: Role;
        sessionId: Types.ObjectId;
    };
}