import { config } from "dotenv"

export interface Env {
    address: string
    private_key: string
}

export const enb: Env = (() => {
    config()
    return {
        address: process.env.ADDRESS || '',
        private_key: process.env.PRIVATE_KEY || ''
    }
})()
