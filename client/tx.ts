import { Transaction } from "@mysten/sui/transactions"
import { enb } from "./lib/env"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { MIST_PER_SUI, SUI_DECIMALS } from "@mysten/sui/utils"


const toMist = (sui: string | bigint | number) => Number(sui) * (10 ** SUI_DECIMALS)
const toSui = (mist: string | bigint | number) => Number(mist) / Number(MIST_PER_SUI)


async function main() {
    const tx = new Transaction()

    const [coin] = tx.splitCoins(tx.gas, [toMist(0.5)])

    tx.transferObjects([coin], "0x76290cfd970038b86699ad7e87c86bace84dbc61b97335d8a2473bf4b0b0ee2f")

    const client = new SuiClient({ url: getFullnodeUrl('testnet') })

    const signer = Ed25519Keypair.fromSecretKey(enb.private_key)

    const result = await client.signAndExecuteTransaction({ signer, transaction: tx, options: { showEffects: true } })

    const res = await client.waitForTransaction({ digest: result.digest })

    console.log({ res })
}



main().catch(console.log)
