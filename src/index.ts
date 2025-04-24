import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

dotenv.config()

const app = express()
const port = 3002

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/', async (req, res) => {
    res.status(200).json({ message: 'Hello from key management service!' })
})

app.listen(port, () => {
    console.log(`[Crypto estate - key management] listening on port ${port}`)
})
