import axios from "axios";

export const getLocation = async (ip: string) => {
    try {
        const cleanIP = ip.replace("::ffff:", "");

        const res = await axios.get(`http://ip-api.com/json/${cleanIP}`);

        if (res.data.status === "fail") {
            return "Unknown location";
        }

        const city = res.data.city || "Unknown city";
        const country = res.data.country || "Unknown country";

        return `${city}, ${country}`;
    } catch (err) {
        return "Unknown location";
    }
};