import bcrypt from "bcrypt";



export const checkPassword = async (enteredPassword: string, userPassword: string) => {
    console.log(enteredPassword, userPassword)
    const checkedPass = await bcrypt.compare(enteredPassword, userPassword)

    return checkedPass;
}