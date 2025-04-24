import dotenv from 'dotenv'
dotenv.config()

import cookieParser from 'cookie-parser'
import express from 'express'
import { useKeyManagementService } from './services/key_management_service'
import { useMarketService } from './services/market_service'
import { useViemService } from './services/viem_service'
import { createOfferValidator } from './validators/offer'
import logger from './utils/logger'

const app = express()
const port = 3002

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(async (req, res, next) => {
    const service = useKeyManagementService(req)
    try {
        const key = await service.getCurrentKey()
        req.headers['privateKey'] = key
        next()
    } catch (e) {
        logger.error('Error in auth middleware:', (e as Error).message)
        res.status(401).json({ message: 'Unauthorized' })
    }
})

app.use((req, res, next) => {
    // Error handling middleware
    try {
        next()
    } catch (error) {
        logger.error('Error handled:', (error as Error).message)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})

app.post('/properties/:id/offer', async (req, res) => {
    const viemService = useViemService()
    const kmService = useKeyManagementService(req)
    const marketService = useMarketService()

    const { id } = req.params
    const body = await createOfferValidator.parseAsync(req.body)

    logger.info('Creating offer...', {
        id,
        amount: body.amount,
    })
    const [tx, to] = await marketService.createOffer(
        BigInt(id),
        BigInt(body.amount)
    )
    logger.info('Trying to sign transaction...')
    const signedTx = await kmService.signTransaction(tx, to)
    logger.info('Transaction signed, sending...')
    const txHash = await viemService.client.sendRawTransaction({
        serializedTransaction: signedTx,
    })
    logger.success('Transaction sent!, hash:', txHash)
    res.status(200).json({
        message: 'Offer created',
        transactionHash: txHash,
    })
})

app.listen(port, () => {
    logger.info(`[Crypto estate - key management] listening on port ${port}`)
})
