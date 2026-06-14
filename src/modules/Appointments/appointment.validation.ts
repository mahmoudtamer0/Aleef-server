import Joi from "joi";

// reusable ObjectId

export const addAppointmentSchema = Joi.object({
    pet: Joi.string().required().messages({
        "any.required": "Pet is required",
    }),

    doctor: Joi.string().required().messages({
        "any.required": "Doctor is required",
    }),

    date: Joi.date().required().messages({
        "any.required": "Date is required",
    }),

    time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) // HH:mm
        .required()
        .messages({
            "string.pattern.base": "Time must be in HH:mm format",
        }),

    reason: Joi.string().min(3).max(500).required(),

    notes: Joi.string().max(1000).min(0).optional(),

})
    .custom((value, helpers) => {
        const now = new Date();

        const appointmentDateTime = new Date(value.date);
        const [hours, minutes] = value.time.split(":");

        appointmentDateTime.setHours(hours, minutes);

        if (appointmentDateTime <= now) {
            return helpers.error("any.invalid");
        }

        return value;
    })
    .messages({
        "any.invalid": "Appointment must be in the future",
    });






export const rejectAppoinmentSchema = Joi.object({
    rejectionReason: Joi.string().min(10).max(500).required(),
})

export const cancelAppointmentByUserSchema = Joi.object({
    reason: Joi.string().max(500).required(),
})