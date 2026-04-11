import catchAsync from "../../utils/catchAsync";
import * as petServices from "./pet.services"





export const addPet = catchAsync(async (req, res, next) => {

    const user = req.user;
    const reqFile = req.file;

    const pet = await petServices.addPet(user, req.body, reqFile);

    return res.status(201).json({
        status: "success",
        message: pet,
    })

})


