import User from "./user.schema"



export const getUsers = async (req: any, res: any) => {


    try {

        const users = await User.find()

        return res.status(200).json({
            msg: "from Aleef",
            users
        })
    } catch (err) {
        console.log(err)
    }
}
