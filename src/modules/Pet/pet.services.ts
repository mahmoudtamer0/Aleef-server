import Pet from "./pet.schema"
import MedicalRecord from "./medicalRecord.schema"
import Vaccination from "./vaccination.schema"
import { getAge } from "../../utils/getPetAge";
import ApiError from "../../utils/ApiError";
import cloudinary from "../../utils/cloudinary";


export const addPet = async (user: any, { name, type, birthDate, gender, weight }: any, reqFile: any) => {

    const pet = await Pet.create({
        owner: user.id,
        name,
        type,
        birthDate,
        gender
    })

    if (weight) {
        pet.weight = Number(weight);
    }

    if (reqFile) {
        pet.profilePic = reqFile.path;
        pet.cloudinary_id = reqFile.filename
    } else {
        if (pet.type == "dog") {
            pet.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939343/dog-2d-cartoon-vector-illustration-white-background-high_889056-22288_hyyjey.avif";
            pet.cloudinary_id = "default"
        } else if (pet.type == "cat") {
            pet.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939576/2842d3b1-b81a-4fef-bc40-0207b2becc7f_u6fecr.jpg";
            pet.cloudinary_id = "default";
        } else if (pet.type == "bird") {
            pet.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939687/blue-bird-with-yellow-orange-wing-blue-beak_1126821-13410_u5rqol.avif";
            pet.cloudinary_id = "default";
        } else {
            pet.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939791/cartoon-lion-standing-cheerfully_1308-181308_sq2uux.avif";
            pet.cloudinary_id = "default";
        }
    }

    await pet.save();


    return pet;

}


export const getUserPets = async (userId: any) => {

    const pets = (await Pet.find({ owner: userId }).sort({ updatedAt: -1 }).lean().select("name type gender profilePic birthDate weight updatedAt"));
    const realPets = []
    for (let i = 0; i < pets.length; i++) {
        const pet = pets[i]

        const age = getAge(pet?.birthDate);

        realPets.push({
            ...pet,
            age
        })
    }

    return realPets;

}



export const getPetProfile = async (petId: any) => {

    const [pet, medicalRecords, upcomingVaccinations, overdueVaccinations, completedVaccinations] =
        await Promise.all([
            Pet.findById(petId)
                .select("-createdAt -updatedAt -__v -cloudinary_id -owner")
                .lean(),

            MedicalRecord.find({ pet: petId })
                .sort({ updatedAt: -1 })
                .limit(3)
                .lean(),

            Vaccination.find({
                pet: petId,
                type: "upcomming",
                nextDueDate: { $gte: new Date() }
            })
                .sort({ nextDueDate: 1 })
                .lean(),

            Vaccination.find({
                pet: petId,
                type: "upcomming",
                nextDueDate: { $lt: new Date() }
            })
                .sort({ nextDueDate: 1 })
                .lean(),

            Vaccination.find({
                pet: petId,
                type: "vaccined"
            })
                .limit(3)
                .sort({ vaccinatedAt: -1 })
                .lean(),
        ]);

    const age = getAge(pet?.birthDate);

    return {
        pet,
        age,
        medicalRecords,
        upcomingVaccinations,
        overdueVaccinations,
        completedVaccinations
    };
};



export const editPet = async (
    user: any,
    petId: string,
    { name, type, birthDate, gender, weight, deleteProfilePic }: any,
    reqFile: any
) => {

    let toDelete = false

    const pet = await Pet.findOne({
        _id: petId,
        owner: user.id
    });


    if (!pet) {
        throw new ApiError(404, "Pet not found");
    }

    if (name) pet.name = name;

    if (type) pet.type = type;

    if (birthDate) pet.birthDate = birthDate;

    if (gender) pet.gender = gender;

    if (weight !== undefined) {
        pet.weight = Number(weight);
    }

    if (reqFile) {

        if (pet.cloudinary_id && pet.cloudinary_id !== "default") {
            toDelete = true;
        }

        pet.profilePic = reqFile.path;
        pet.cloudinary_id = reqFile.filename;
    }

    if (deleteProfilePic == true || deleteProfilePic == "true") {
        toDelete = true;

        if (pet.type === "dog") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939343/dog-2d-cartoon-vector-illustration-white-background-high_889056-22288_hyyjey.avif";
        } else if (pet.type === "cat") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939576/2842d3b1-b81a-4fef-bc40-0207b2becc7f_u6fecr.jpg";
        } else if (pet.type === "bird") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939687/blue-bird-with-yellow-orange-wing-blue-beak_1126821-13410_u5rqol.avif";
        } else {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939791/cartoon-lion-standing-cheerfully_1308-181308_sq2uux.avif";
        }

        pet.cloudinary_id = "default";
    }

    if (!reqFile && pet.cloudinary_id === "default" && type) {

        if (type === "dog") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939343/dog-2d-cartoon-vector-illustration-white-background-high_889056-22288_hyyjey.avif";
        } else if (type === "cat") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939576/2842d3b1-b81a-4fef-bc40-0207b2becc7f_u6fecr.jpg";
        } else if (type === "bird") {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939687/blue-bird-with-yellow-orange-wing-blue-beak_1126821-13410_u5rqol.avif";
        } else {
            pet.profilePic =
                "https://res.cloudinary.com/ddgniiotg/image/upload/v1775939791/cartoon-lion-standing-cheerfully_1308-181308_sq2uux.avif";
        }
    }

    await pet.save();

    if (toDelete) {
        setImmediate(async () => {
            await cloudinary.uploader.destroy(pet.cloudinary_id);
        })
    }

    return pet;
};



export const deletePet = async (user: any, petId: string) => {

    const pet = await Pet.findOneAndDelete({
        _id: petId,
        owner: user.id
    });

    if (!pet) {
        throw new ApiError(404, "Pet not found");
    }

    if (pet.cloudinary_id && pet.cloudinary_id !== "default") {
        setImmediate(async () => {
            await cloudinary.uploader.destroy(pet.cloudinary_id);
        })
    }

    await MedicalRecord.deleteMany({ pet: petId });
    await Vaccination.deleteMany({ pet: petId });

    return;

}