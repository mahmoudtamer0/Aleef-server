import jwt from "jsonwebtoken"

export const generateToken = (name: string, id: string, role: string) => {

    const jwtSecretKey = process.env["JWT_SECRET"]

    if (!jwtSecretKey) throw new Error("jwtSecretKey is not defined");
    const token = jwt.sign({ name, id, role }, jwtSecretKey, { expiresIn: "7d" })

    return token
}