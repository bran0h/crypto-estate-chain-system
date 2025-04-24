import { Request } from 'express'

export const getCookie = (event: Request, name: string) => {
    const cookieHeader = event.headers.cookie
    if (!cookieHeader) {
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
