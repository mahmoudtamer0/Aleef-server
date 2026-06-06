
require("dotenv").config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
// import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import usersRouter from "./modules/User/users.router";
import doctorRouter from "./modules/Doctor/doctor.router";
import productsRouter from "./modules/Shop/Product/products.router";
import ordersRouter from "./modules/Shop/Order/order.router";
import petsRouter from "./modules/Pet/pet.router";
import appointmentsRouter from "./modules/Appointments/appointment.router";
import chatRouter from "./modules/Chat/chat.router";
import globalErrorHandler from "./middlewares/error";

const app = express();
app.set("trust proxy", 1);


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

app.use(apiLimiter)

app.use('/api/v1/users/login', authLimiter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/doctors', doctorRouter)
app.use('/api/v1/products', productsRouter)
app.use('/api/v1/orders', ordersRouter)
app.use('/api/v1/pets', petsRouter)
app.use('/api/v1/appointments', appointmentsRouter)
app.use('/api/v1/chats', chatRouter)
app.use('/api/v1', (req, res, next) => {
    res.status(200).json({
        status: "success",
        message: "Welcome to Aleef API"
    })
    next();
});
//Global Error Handler
app.use(globalErrorHandler);


export default app;