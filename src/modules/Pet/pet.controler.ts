import catchAsync from "../../utils/catchAsync";
import * as petServices from "./pet.services"





export const addPet = catchAsync(async (req, res, next) => {

    const user = req.user;
    const reqFile = req.file;

    const pet = await petServices.addPet(user, req.body, reqFile);

    return res.status(201).json({
        status: "success",
        pet,
    })

})

export const getMyPets = catchAsync(async (req, res, next) => {

    const user = req.user;

    const pets = await petServices.getMyPets(user);

    return res.status(200).json({
        status: "success",
        pets,
    })

})

export const getPetProfile = catchAsync(async (req, res, next) => {

    const { petId } = req.params;

    const pet = await petServices.getPetProfile(petId);

    return res.status(200).json({
        status: "success",
        pet: {
            _id: pet.pet?._id,
            name: pet.pet?.name,
            type: pet.pet?.type,
            gender: pet.pet?.gender,
            profilePic: pet.pet?.profilePic,
            weight: pet.pet?.weight,
            age: pet.age,
        },
        medicalRecords: pet.medicalRecords,
        upcommingVaccinations: pet.upcomingVaccinations,
        overdueVaccinations: pet.overdueVaccinations,
        completedVaccinations: pet.completedVaccinations,
    })

})

export const editPet = catchAsync(async (req, res, next) => {

    const pet = await petServices.editPet(
        req.user,
        (req as any).params.petId,
        req.body,
        req.file
    );

    return res.status(200).json({
        status: 200,
        message: "Pet updated successfully",
        data: pet
    });
});