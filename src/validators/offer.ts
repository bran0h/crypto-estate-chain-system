import zod from 'zod'

export const createOfferValidator = zod.object({
    // Wei String to BigInt
    amount: zod.string().transform((val) => {
        const parsed = parseInt(val)
        if (isNaN(parsed)) {
            throw new Error('Invalid amount')
        }
        return BigInt(parsed)
    }),
})
