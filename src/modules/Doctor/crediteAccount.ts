import mongoose from "mongoose";

const crediteAccountSchema = new mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
        },

        debit: {
            type: Number,
            default: 0,
        },

        credit: {
            type: Number,
            default: 0,
        },

    },
    { timestamps: true }
);


const creditAccount = mongoose.model("CreditAccount", crediteAccountSchema);

export default creditAccount