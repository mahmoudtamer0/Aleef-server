import mongoose from "mongoose";
import app from "./app";


const dbUrl = process.env["DB_URL"];

if (!dbUrl) {
    throw new Error("DB_URL is not defined");
}
const PORT = process.env["PORT"] || 3000;
mongoose.connect(dbUrl)
    .then(() => {
        console.log("DB Connected");


        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    })
    .catch((err: any) => console.log(err));