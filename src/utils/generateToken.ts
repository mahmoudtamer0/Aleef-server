import jwt from "jsonwebtoken"

export const generateToken = (name: string, id: string, role: string, sessionId: string, email: string) => {

    const jwtSecretKey = process.env["JWT_SECRET"]

    if (!jwtSecretKey) throw new Error("jwtSecretKey is not defined");
    if (!name || !id || !role || !sessionId || !email) throw new Error("name, id, role, sessionId, email are required");
    const token = jwt.sign({ name, id, role, sessionId, email }, jwtSecretKey, { expiresIn: "7d" })

    return token
}