import mongoose from "mongoose";
import app from "./app";

const dbUrl = process.env["DB_URL"];
if (!dbUrl) throw new Error("DB_URL is not defined");

const PORT = process.env["PORT"] || 3000;

if (process.env["NODE_ENV"] == "development") {

    mongoose.connect(dbUrl)
        .then(() => {
            console.log("✅ DB Connected");
            app.listen(PORT, () => {
                console.log(`🚀 Server running on port ${PORT}`);
            });
        })
        .catch((err) => console.log(err));
}