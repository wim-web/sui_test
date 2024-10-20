import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions"
import { config } from "dotenv";

const package_id = "0xef0fb8b9828f4d980d30c17ce0ac9a2cd8eb793497cce7982b5c1e67077ac263"

async function main() {
    config()
    const client = new SuiClient({
        url: getFullnodeUrl('testnet')
    })

    const private_key = process.env.PRIVATE_KEY || ''

    const keypair = Ed25519Keypair.fromSecretKey(private_key);

    const tx = new Transaction()

    let f_result = tx.moveCall({
        package: package_id,
        module: "simpleeee",
        function: "oumu",
        arguments: [
            tx.pure.u64(2)
        ]
    })

    tx.moveCall({
        package: package_id,
        module: "simpleeee",
        function: "double",
        arguments: [
            // {
            //     Result: 0
            // }
            f_result
        ]
    })

    const result = await client.signAndExecuteTransaction({
        signer: keypair, transaction: tx, options: {
            // showEffects: true,
            // showEvents: true,
        }
    })

    console.log({ result })
}


main().catch(console.log)
