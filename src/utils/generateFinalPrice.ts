

export const generateFinalPrice = async (originalPrice: number, discount: number) => {

    const finalPrice = originalPrice - (originalPrice * discount) / 100

    return finalPrice
}
