import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";
import { Request } from "express";
import { FileFilterCallback } from "multer";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: "aleef/users",
            format: file.mimetype.split("/")[1],
            public_id: file.originalname.split(".")[0],
        }
    }
});

export const upload = multer({
    storage: storage,

    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (!file.mimetype.startsWith("image")) {
            return cb(new Error("Only images are allowed"));
        }
        cb(null, true);
    }
});



