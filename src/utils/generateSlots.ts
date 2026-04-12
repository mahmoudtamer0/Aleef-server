export const generateSlots = (
    start: string,
    end: string,
    duration: number
): string[] => {
    const slots: string[] = [];

    const startParts = start.split(":");
    const endParts = end.split(":");

    if (startParts.length !== 2 || endParts.length !== 2) return [];

    const startH = Number(startParts[0]);
    const startM = Number(startParts[1]);

    const endH = Number(endParts[0]);
    const endM = Number(endParts[1]);

    if (
        isNaN(startH) ||
        isNaN(startM) ||
        isNaN(endH) ||
        isNaN(endM)
    ) {
        return [];
    }

    let h = startH;
    let m = startM;

    while (h < endH || (h === endH && m < endM)) {
        slots.push(
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );

        m += duration;

        if (m >= 60) {
            h += Math.floor(m / 60);
            m = m % 60;
        }
    }

    return slots;
};