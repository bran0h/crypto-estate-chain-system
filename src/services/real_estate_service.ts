import type { Account, Address } from 'viem'
import { useViemService } from './viem_service'
import consola from 'consola'
import RealEstateABI, { REAL_ESTATE_ADDRESS } from '../abi/RealEstateABI'
import { REAL_ESTATE_MARKET_ADDRESS } from '../abi/RealEstateMarketABI'

const logger = consola.create({
    defaults: {
        tag: 'real_estate_service',
    },
})
export function useRealEstateService() {
    const { client } = useViemService()

    const getBalance = (add: Address) => {
        logger.info('Getting balance for address', {
            address: add,
        })
        return client.readContract({
            address: REAL_ESTATE_ADDRESS,
            abi: RealEstateABI,
            functionName: 'balanceOf',
            args: [add],
        })
    }

    const isApprovedForMarket = (owner: Address) => {
        logger.info('Checking approval for market', {
            owner,
        })
        return client.readContract({
            address: REAL_ESTATE_ADDRESS,
            abi: RealEstateABI,
            functionName: 'isApprovedForAll',
            args: [owner, REAL_ESTATE_MARKET_ADDRESS],
        })
    }

    const approveForMarket = async (account: Account) => {
        logger.info('Approving for market', {
            account,
        })
        const { request } = await client.simulateContract({
            address: REAL_ESTATE_ADDRESS,
            abi: RealEstateABI,
            functionName: 'setApprovalForAll',
            args: [REAL_ESTATE_MARKET_ADDRESS, true],
            account,
        })
        return client.writeContract(request)
    }

    return { getBalance, isApprovedForMarket, approveForMarket }
}
