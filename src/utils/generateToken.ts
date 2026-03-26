import jwt from "jsonwebtoken"

export const generateToken = (name: string, id: string, role: string, sessionId: string) => {

    const jwtSecretKey = process.env["JWT_SECRET"]

    if (!jwtSecretKey) throw new Error("jwtSecretKey is not defined");
    const token = jwt.sign({ name, id, role, sessionId }, jwtSecretKey, { expiresIn: "7d" })

    return token
}