const cloudinary = require("cloudinary").v2;

const cloudName = process.env["CLOUD_NAME"]
const cloudApiKey = process.env["CLOUD_API_KEY"]
const cloudApySecret = process.env["CLOUD_API_SECRET"]

cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudApiKey,
    api_secret: cloudApySecret
});

export default cloudinary;