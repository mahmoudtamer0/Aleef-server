import { getAge } from "../../utils/getPetAge";
import ApiError from "../../utils/ApiError";
import cloudinary from "../../utils/cloudinary";
import pool from "../../db";
import { clearCache, getCache, setCache } from "../../cache";


const DEFAULT_PICS: Record<string, string> = {
    dog: "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939343/dog-2d-cartoon-vector-illustration-white-background-high_889056-22288_hyyjey.avif",
    cat: "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939576/2842d3b1-b81a-4fef-bc40-0207b2becc7f_u6fecr.jpg",
    bird: "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939687/blue-bird-with-yellow-orange-wing-blue-beak_1126821-13410_u5rqol.avif",
    other: "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939791/cartoon-lion-standing-cheerfully_1308-181308_sq2uux.avif"
};

const getDefaultPic = (type: string) => DEFAULT_PICS[type] || DEFAULT_PICS["other"];

export const addPet = async (user: any, { name, type, birthDate, gender, weight }: any, reqFile: any) => {

    const profilePic = reqFile ? reqFile.path : getDefaultPic(type);
    const cloudinary_id = reqFile ? reqFile.filename : "default";

    const result = await pool.query(
        `INSERT INTO pets (owner, name, type, "birthDate", gender, weight, "profilePic", cloudinary_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [user.id, name.toLowerCase(), type, birthDate || null, gender, weight ? Number(weight) : null, profilePic, cloudinary_id]
    );

    clearCache(`pets:${user.id}`);

    return result.rows[0];
};


export const getUserPets = async (userId: any) => {

    const cacheKey = `pets:${userId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT id, name, type, gender, "profilePic", "birthDate", weight, "updatedAt"
         FROM pets
         WHERE owner = $1
         ORDER BY "updatedAt" DESC`,
        [userId]
    );

    const pets = result.rows.map(pet => ({
        ...pet,
        age: getAge(pet.birthDate)
    }));

    setCache(cacheKey, pets, 500);
    return pets;
};


export const getPetProfile = async (petId: any) => {

    const cacheKey = `pet_profile:${petId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [petResult, medicalRecords, upcomingVaccinations, overdueVaccinations, completedVaccinations] =
        await Promise.all([
            pool.query(
                `SELECT id, name, type, gender, "profilePic", "birthDate", weight
                 FROM pets WHERE id = $1`,
                [petId]
            ),
            pool.query(
                `SELECT * FROM medical_records WHERE pet = $1 ORDER BY "updatedAt" DESC LIMIT 3`,
                [petId]
            ),
            pool.query(
                `SELECT * FROM vaccinations WHERE pet = $1 AND type = 'upcomming' AND "nextDueDate" >= NOW() ORDER BY "nextDueDate" ASC`,
                [petId]
            ),
            pool.query(
                `SELECT * FROM vaccinations WHERE pet = $1 AND type = 'upcomming' AND "nextDueDate" < NOW() ORDER BY "nextDueDate" ASC`,
                [petId]
            ),
            pool.query(
                `SELECT * FROM vaccinations WHERE pet = $1 AND type = 'vaccined' ORDER BY "vaccinatedAt" DESC LIMIT 3`,
                [petId]
            )
        ]);

    const pet = petResult.rows[0];

    if (!pet) throw new ApiError(404, "Pet not found");
    const age = getAge(pet.birthDate);
    const response = {
        pet,
        age: age,
        medicalRecords: medicalRecords.rows,
        upcomingVaccinations: upcomingVaccinations.rows,
        overdueVaccinations: overdueVaccinations.rows,
        completedVaccinations: completedVaccinations.rows
    };

    setCache(cacheKey, response, 300);
    return response;
};



export const editPet = async (user: any, petId: string, { name, type, birthDate, gender, weight, deleteProfilePic }: any, reqFile: any) => {

    const petResult = await pool.query(
        `SELECT * FROM pets WHERE id = $1 AND owner = $2`,
        [petId, user.id]
    );

    if (!petResult.rows.length) throw new ApiError(404, "Pet not found");

    const pet = petResult.rows[0];
    let toDelete = false;
    let oldCloudinaryId = pet.cloudinary_id;

    let newProfilePic = pet.profilePic;
    let newCloudinaryId = pet.cloudinary_id;

    if (reqFile) {
        if (pet.cloudinary_id && pet.cloudinary_id !== "default") toDelete = true;
        newProfilePic = reqFile.path;
        newCloudinaryId = reqFile.filename;
    }

    if (deleteProfilePic == true || deleteProfilePic == "true") {
        toDelete = true;
        newProfilePic = getDefaultPic(type || pet.type);
        newCloudinaryId = "default";
    }

    if (!reqFile && newCloudinaryId === "default" && type) {
        newProfilePic = getDefaultPic(type);
    }

    const updated = await pool.query(
        `UPDATE pets SET
            name = COALESCE($1, name),
            type = COALESCE($2, type),
            "birthDate" = COALESCE($3, "birthDate"),
            gender = COALESCE($4, gender),
            weight = COALESCE($5, weight),
            "profilePic" = $6,
            cloudinary_id = $7,
            "updatedAt" = NOW()
         WHERE id = $8 AND owner = $9
         RETURNING *`,
        [
            name ? name.toLowerCase() : null,
            type || null,
            birthDate || null,
            gender || null,
            weight !== undefined ? Number(weight) : null,
            newProfilePic,
            newCloudinaryId,
            petId,
            user.id
        ]
    );

    clearCache(`pets:${user.id}`);
    clearCache(`pet_profile:${petId}`);

    if (toDelete) {
        setImmediate(async () => {
            await cloudinary.uploader.destroy(oldCloudinaryId);
        });
    }

    return updated.rows[0];
};


export const deletePet = async (user: any, petId: string) => {

    const petResult = await pool.query(
        `DELETE FROM pets WHERE id = $1 AND owner = $2 RETURNING *`,
        [petId, user.id]
    );

    if (!petResult.rows.length) throw new ApiError(404, "Pet not found");

    const pet = petResult.rows[0];

    clearCache(`pets:${user.id}`);
    clearCache(`pet_profile:${petId}`);

    if (pet.cloudinary_id && pet.cloudinary_id !== "default") {
        setImmediate(async () => {
            await cloudinary.uploader.destroy(pet.cloudinary_id);
        });
    }

    await Promise.all([
        pool.query(`DELETE FROM medical_records WHERE pet = $1`, [petId]),
        pool.query(`DELETE FROM vaccinations WHERE pet = $1`, [petId])
    ]);

    return;
};

export const getMedicalRecordDetails = async (recordId: string) => {
    const cacheKey = `medical_records:${recordId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    const result = await pool.query(
        `SELECT 
            mr.id,
            mr.condition,
            mr.title,
            mr.description,
            mr.attachments,
            mr.date,
            mr."createdAt",
            d.id as doctor_id,
            d.name as doctor_name,
            d."profilePic" as doctor_pic
         FROM medical_records mr
         JOIN doctors d ON d.id = mr.doctor
         WHERE mr.id = $1`,
        [recordId]
    );

    if (!result.rows.length) throw new ApiError(404, "Medical record not found");

    setCache(cacheKey, result.rows[0], 200);

    return result.rows[0];
};