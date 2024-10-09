import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { enb } from "./lib/env"

async function main() {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') })

    const coins = await client.getCoins({ owner: enb.address })

    console.log(coins.data[0].balance)
    console.log(coins.data[0].coinType)
}


main().catch(console.log)
