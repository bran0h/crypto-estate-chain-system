import { Request } from 'express'
import logger from './logger'

export const getCookie = (event: Request, name: string) => {
    const cookieHeader = event.headers.cookie
    if (!cookieHeader) {
        logger.warn('No cookies found in request headers')
        return null
    }
    const cookies = cookieHeader.split('; ')
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        if (key === name) {
            return decodeURIComponent(value)
        }
    }
    return null
}
