import Pet from "./pet.schema"
import ApiError from "../../utils/ApiError";
import { getAge } from "../../utils/getPetAge";


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


export const getMyPets = async (user: any) => {

    const pets = await Pet.find({ owner: user.id }).lean().select("name type gender profilePic birthDate")
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

    const pet = await Pet.findById({ _id: petId }).lean().select("-createdAt -updatedAt -__v -cloudinary_id -owner");

    const age = getAge(pet?.birthDate);



    return { pet, age };

}
