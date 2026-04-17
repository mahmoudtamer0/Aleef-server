const jwt = require("jsonwebtoken");

export const verifyJWT = (token: string) => {
    try {
        return jwt.verify(token, process.env["JWT_SECRET"]);
    } catch {
        return null;
    }
};