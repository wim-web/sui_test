import { getFaucetHost, requestSuiFromFaucetV0 } from '@mysten/sui/faucet';
import { config } from 'dotenv'


async function main() {
    config()

    const address = process.env.ADDRESS || ''

    if (address === '') {
        throw new Error("require ADDRESS");
    }

    console.log(await faucet(address))
}

async function faucet(address: string) {
    const response = await requestSuiFromFaucetV0({
        host: getFaucetHost('testnet'),
        recipient: address,
    })

    return response
}



main().catch(console.log)
