import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { useKeyManagementService } from './services/key_management_service'
import { useMarketService } from './services/market_service'
import { useViemService } from './services/viem_service'
import { Hex } from 'viem'
import { createOfferValidator } from './validators/offer'

dotenv.config()

const app = express()
const port = 3002

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(async (req, res, next) => {
    const service = useKeyManagementService(req)
    const key = await service.getCurrentKey()
    if (!key) {
        res.status(401).json({ message: 'Unauthorized - missing cookie 0' })
        return
    }
    req.headers['privateKey'] = key
    next()
})

app.post('/properties/:id/offer', async (req, res) => {
    const { id } = req.params
    const { privateKey } = req.headers
    const body = await createOfferValidator.parse(req.body)
    const viemService = useViemService()
    const account = viemService.getAccount(privateKey as Hex)
    const service = useMarketService()

    const txHash = await service.createOffer(
        account,
        BigInt(id),
        BigInt(body.amount)
    )
    res.status(200).json({ offerTx: txHash })
})

app.listen(port, () => {
    console.log(`[Crypto estate - key management] listening on port ${port}`)
})
