import { ofetch } from 'ofetch'
import type {
    EncodeFunctionDataReturnType,
    Hex,
    SignTransactionReturnType,
} from 'viem'
import { getCookie } from '../utils/cookie'
import { Request } from 'express'

type KeyManagementResponse = {
    privateKey: Hex
}

type SignTransactionResponse = {
    signature: SignTransactionReturnType
}
const kmApi = ofetch.create({
    baseURL: process.env.KEY_MANAGEMENT_API,
})

const TOKEN_COOKIE_0 = `sb-${process.env.SUPABASE_INSTANCE}-auth-token.0`
const TOKEN_COOKIE_1 = `sb-${process.env.SUPABASE_INSTANCE}-auth-token.1`

const getAuthCookie = (req: Request) => {
    const cookie0 = getCookie(req, TOKEN_COOKIE_0)
    const cookie1 = getCookie(req, TOKEN_COOKIE_1)
    if (!cookie0) {
        throw new Error('Unauthorized - missing cookie 0')
    }
    if (!cookie1) {
        throw new Error('Unauthorized - missing cookie 1')
    }
    return `${TOKEN_COOKIE_0}=${cookie0}; ${TOKEN_COOKIE_1}=${cookie1}`
}

export function useKeyManagementService(req: Request) {
    const getCurrentKey = async () => {
        const resp = await kmApi<KeyManagementResponse>('/key', {
            headers: {
                Cookie: getAuthCookie(req),
            },
        })
        return resp.privateKey
    }

    const signTransaction = async (
        data: EncodeFunctionDataReturnType,
        to: Hex,
        value?: bigint
    ) => {
        const resp = await kmApi<SignTransactionResponse>('/sign', {
            method: 'POST',
            body: {
                data,
                to,
                value: value ? value.toString() : undefined,
            },
            credentials: 'include',
            headers: {
                Cookie: getAuthCookie(req),
            },
        })
        return resp.signature
    }

    return { getCurrentKey, signTransaction }
}
