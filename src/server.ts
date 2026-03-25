import mongoose from "mongoose";
import app from "./app";


const dbUrl = process.env["DB_URL"];

if (!dbUrl) {
    throw new Error("DB_URL is not defined");
}

mongoose.connect(dbUrl)
    .then(() => {
        console.log("DB Connected");
        app.listen(4000, "0.0.0.0", () => {
            console.log("Server running");
        });
    })
    .catch((err: any) => console.log(err));