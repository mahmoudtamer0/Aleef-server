import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";
import { Request } from "express";
import { FileFilterCallback } from "multer";

const productsStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        return {
            folder: "aleef/products",

            transformation: [
                {
                    width: 300,
                    height: 300,
                    crop: "fill",
                    gravity: "auto",
                    quality: "auto",
                    fetch_format: "auto",
                    flags: "progressive"
                }
            ],

            public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
        };
    }
});

export const upload = multer({
    storage: productsStorage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {

        cb(null, true);
    }
});
