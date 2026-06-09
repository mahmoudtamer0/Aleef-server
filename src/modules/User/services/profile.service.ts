import pool from "../../../db";
import ApiError from "../../../utils/ApiError";
import deleteProfilPic from "../../../utils/deleteProfile";

export const getMe = async (userId: any): Promise<any> => {

    const userProfile = await pool.query("SELECT name, email, phone, \"profilePic\" FROM users WHERE id = $1", [userId])

    if (userProfile.rows.length == 0) throw new ApiError(404, "user not fount");

    return userProfile.rows[0];
}

export const editUserProfile = async (user: any, reqBody: any, reqFile: any): Promise<any> => {
    const { name, phone, changeProfilePic, deleteProfilePic } = reqBody;

    const fields = [];
    const values = [];
    let index = 1;



    if (name) {
        fields.push(`name = $${index}`)
        values.push(name);
        index++;
    };

    if (phone) {
        fields.push(`phone = $${index}`)
        values.push(phone);
        index++;
    }

    let oldImageId: string | null = null;

    let userProfile;

    if (deleteProfilePic == true || deleteProfilePic == "true" || changeProfilePic === true || changeProfilePic === "true") {
        userProfile = await pool.query(`SELECT cloudinary_id FROM users WHERE id = $1`, [user.id]);
    }


    if (deleteProfilePic == true || deleteProfilePic == "true") {

        if (userProfile?.rows[0].cloudinary_id == "default") {
            throw new ApiError(400, "user don't have profile pic");
        }


        oldImageId = userProfile?.rows[0].cloudinary_id;


        fields.push(`"profilePic" = $${index}`)
        values.push("https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg")
        index++

        fields.push(`cloudinary_id = $${index}`)
        values.push("default")
        index++
    }



    if (changeProfilePic === true || changeProfilePic === "true") {

        if (!reqFile) {
            console.error("❌ No file uploaded from frontend");
            throw new ApiError(400, "No file uploaded");
        }


        if (userProfile?.rows[0].cloudinary_id != "default") {
            oldImageId = userProfile?.rows[0].cloudinary_id;
        }

        fields.push(`"profilePic" = $${index}`)
        values.push(reqFile.path)
        index++


        fields.push(`cloudinary_id = $${index}`)
        values.push(reqFile.filename)
        index++
    }


    let updatedUser;

    if (fields.length === 0) {
        throw new ApiError(400, "No data provided to update");
    }

    if (fields.length > 0) {
        values.push(user.id)
        updatedUser = await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${index} RETURNING id,name,email,phone`, values)
    }

    if (oldImageId) {
        setImmediate(async () => {
            try {
                await deleteProfilPic(oldImageId!);
            } catch (err) {
                console.error("❌ Failed to delete image:", err);
            }
        });
    }

    return updatedUser?.rows[0]

}