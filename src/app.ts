
require("dotenv").config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import usersRouter from "./modules/User/users.router";
import globalErrorHandler from "./middlewares/error";

const app = express();
app.set("trust proxy", 1);


import { connectDB } from "./utils/db";
if (process.env["NODE_ENV"] == "production") {

    let isConnected = false;

    app.use(async (req, res, next) => {
        if (!isConnected) {
            await connectDB();
            isConnected = true;
        }
        next();
    });
}



app.use(helmet());
app.use(cors());
app.use(express.json());
// app.use(mongoSanitize({ allowDots: true }));
app.use(hpp());


const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: {
        status: "fail",
        message: "Too many requests, try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, try again later"
});



app.use(cookieParser());

app.use('/api/v1/users', usersRouter)

//Global Error Handler
app.use(globalErrorHandler);


export default app;