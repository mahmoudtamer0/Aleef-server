export const formatDate = (date: Date): string => {
    const result = date.toISOString().split("T")[0];

    if (!result) {
        throw new Error("Invalid date format");
    }

    return result;
};