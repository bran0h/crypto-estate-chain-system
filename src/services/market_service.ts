import RealEstateMarketABI, {
    REAL_ESTATE_MARKET_ADDRESS,
} from '../abi/RealEstateMarketABI'
import { useViemService } from './viem_service'
import type { Account } from 'viem'
import { REAL_ESTATE_ADDRESS } from '../abi/RealEstateABI'
import consola from 'consola'

const logger = consola.create({
    defaults: {
        tag: 'market_service',
    },
})

export function useMarketService() {
    const { client } = useViemService()

    const createOffer = async (
        account: Account,
        tokenId: bigint,
        price: bigint
    ) => {
        logger.info('Creating offer', {
            tokenId,
            price,
        })
        const { request } = await client.simulateContract({
            address: REAL_ESTATE_MARKET_ADDRESS,
            abi: RealEstateMarketABI,
            functionName: 'createOffer',
            args: [tokenId, REAL_ESTATE_ADDRESS, price],
            account,
        })
        const resp = await client.writeContract(request)
        logger.success('Offer created', {
            resp,
        })
        return resp
    }

    const buyOffer = async (
        account: Account,
        tokenId: bigint,
        price: bigint
    ) => {
        logger.info('Buying offer', {
            tokenId,
            price,
        })
        const { request } = await client.simulateContract({
            address: REAL_ESTATE_MARKET_ADDRESS,
            abi: RealEstateMarketABI,
            functionName: 'buyOffer',
            args: [tokenId],
            account,
            value: price,
        })
        const resp = await client.writeContract(request)
        logger.success('Offer bought', {
            resp,
        })
        return resp
    }

    const removeOffer = async (account: Account, tokenId: bigint) => {
        logger.info('Removing offer', {
            tokenId,
        })
        const { request } = await client.simulateContract({
            address: REAL_ESTATE_MARKET_ADDRESS,
            abi: RealEstateMarketABI,
            functionName: 'removeOffer',
            args: [tokenId],
            account,
        })
        const resp = await client.writeContract(request)
        logger.success('Offer removed', {
            resp,
        })
        return resp
    }

    return { createOffer, buyOffer, removeOffer }
}
