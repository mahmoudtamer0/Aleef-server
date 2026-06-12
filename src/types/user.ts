import { Role } from "../types/express";

export interface User {
    id: string;
    name: string;
    email: string;
    sessionId: string;
    role: Role;
}