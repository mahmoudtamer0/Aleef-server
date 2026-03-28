import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env["CLOUD_NAME"]
const cloudApiKey = process.env["CLOUD_API_KEY"]
const cloudApiSecret = process.env["CLOUD_API_SECRET"]

if (!cloudName || !cloudApiKey || !cloudApiSecret) {
    throw new Error("Cloudinary environment variables are missing");
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudApiKey,
    api_secret: cloudApiSecret
});

export default cloudinary;