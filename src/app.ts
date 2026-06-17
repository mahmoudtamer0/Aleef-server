require("dotenv").config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import { vaccinationReminder } from "./jobs/vaccinationReminder.job";

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(hpp());
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: { status: "fail", message: "Too many requests, try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { status: "fail", message: "Too many login attempts, try again later" }
});

vaccinationReminder();


app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users', apiLimiter, usersRouter);
app.use('/api/v1/doctors', apiLimiter, doctorRouter);
app.use('/api/v1/products', apiLimiter, productsRouter);
app.use('/api/v1/orders', apiLimiter, ordersRouter);
app.use('/api/v1/pets', apiLimiter, petsRouter);
app.use('/api/v1/appointments', apiLimiter, appointmentsRouter);
app.use('/api/v1/chats', apiLimiter, chatRouter);

app.use('/api/v1', (req, res) => {
    res.status(404).json({ status: "fail", message: "Route not found" });
});

app.use(globalErrorHandler);

export default app;