export const getAge = (birthdate: any) => {
    const birth = new Date(birthdate);
    const today = new Date();

    const diffMs = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Under 90 days → show days
    if (diffDays <= 90) {
        return `${diffDays} days`;
    }

    // Under 24 months → show months
    const diffMonths =
        (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());

    if (diffMonths < 24) {
        return `${diffMonths} months`;
    }

    // 2+ years → show years
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
        years--;
    }

    return `${years} years`;
};