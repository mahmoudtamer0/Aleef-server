import cloudinary from "./cloudinary";

const deleteProfilPic = async (cloudinary_id: string) => {
    await cloudinary.uploader.destroy(cloudinary_id);
}

export default deleteProfilPic