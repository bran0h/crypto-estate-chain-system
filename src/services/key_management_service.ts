import { ofetch } from 'ofetch'
import type { Hex } from 'viem'
import { getCookie } from '../utils/cookie'
import { Request } from 'express'

const RUNTIME_CONFIG = {
    keyManagementApi: process.env.KEY_MANAGEMENT_API,
    supabaseInstance: process.env.SUPABASE_INSTANCE,
}

const api = ofetch.create({
    baseURL: RUNTIME_CONFIG.keyManagementApi,
})

type KeyManagementResponse = {
    privateKey: Hex
}
export function useKeyManagementService(req: Request) {
    const TOKEN_COOKIE_0 = `sb-${RUNTIME_CONFIG.supabaseInstance}-auth-token.0`
    const TOKEN_COOKIE_1 = `sb-${RUNTIME_CONFIG.supabaseInstance}-auth-token.1`

    const getCurrentKey = async () => {
        // Forward supabase cookies
        console.log(TOKEN_COOKIE_0, TOKEN_COOKIE_1)
        const cookie0 = getCookie(req, TOKEN_COOKIE_0)
        const cookie1 = getCookie(req, TOKEN_COOKIE_1)
        if (!cookie0) {
            throw new Error('Unauthorized - missing cookie 0')
        }
        if (!cookie1) {
            throw new Error('Unauthorized - missing cookie 1')
        }

        const resp = await api<KeyManagementResponse>('/key', {
            credentials: 'include',
            headers: {
                Cookie: `${TOKEN_COOKIE_0}=${cookie0}; ${TOKEN_COOKIE_1}=${cookie1}`,
            },
        })
        return resp.privateKey
    }

    return { getCurrentKey }
}
