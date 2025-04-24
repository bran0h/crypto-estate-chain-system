import { encodeFunctionData } from 'viem'
import RealEstateMarketABI, {
    REAL_ESTATE_MARKET_ADDRESS,
} from '../abi/RealEstateMarketABI'
import { REAL_ESTATE_ADDRESS } from '../abi/RealEstateABI'

export function useMarketService() {
    const createOffer = async (tokenId: bigint, price: bigint) => {
        const data = encodeFunctionData({
            abi: RealEstateMarketABI,
            functionName: 'createOffer',
            args: [tokenId, REAL_ESTATE_ADDRESS, price],
        })
        return [data, REAL_ESTATE_MARKET_ADDRESS] as const
    }

    const buyOffer = async (tokenId: bigint) => {
        const data = encodeFunctionData({
            abi: RealEstateMarketABI,
            functionName: 'buyOffer',
            args: [tokenId],
        })
        return [data, REAL_ESTATE_MARKET_ADDRESS] as const
    }

    const removeOffer = async (tokenId: bigint) => {
        const data = encodeFunctionData({
            abi: RealEstateMarketABI,
            functionName: 'removeOffer',
            args: [tokenId],
        })
        return [data, REAL_ESTATE_MARKET_ADDRESS] as const
    }

    return { createOffer, buyOffer, removeOffer }
}
