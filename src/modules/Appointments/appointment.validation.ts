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

export const addReviewSchema = Joi.object({
    rate: Joi.number().max(5).min(1).required().messages({
        "any.required": "Rate is required",
        "number.base": "Rate must be between 1 and 5",
    }),
    comment: Joi.string().max(500).min(0).optional(),
})


export const endAppointmentSchema = Joi.object({
    medicalRecord: Joi.object({
        title: Joi.string().required(),
        condition: Joi.string().required(),
        description: Joi.string().required(),
    }).required(),

    vaccination: Joi.object({
        vaccineName: Joi.string().required(),
        dose: Joi.string().optional(),
        notes: Joi.string().optional(),
    }).optional(),

    upCommingVaccination: Joi.object({
        vaccineName: Joi.string().required(),
        nextDueDate: Joi.string().optional(),
    }).optional(),

    chatExpiryDays: Joi.number().integer().optional(),
});