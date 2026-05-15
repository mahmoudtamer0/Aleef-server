import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";
import { Request } from "express";
import { FileFilterCallback } from "multer";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: "aleef/appoinments",
            transformation: [
                { width: 500, height: 500, crop: "limit", quality: "auto" }
            ],
            format: undefined,
            public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
        }
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {

        cb(null, true);
    }
});



