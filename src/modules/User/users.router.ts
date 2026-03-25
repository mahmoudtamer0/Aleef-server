import express from "express";
import { getUsers } from "./users.controler";


const router = express.Router()


router.get("/", getUsers);

export default router