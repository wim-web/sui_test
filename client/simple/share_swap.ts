import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { config } from "dotenv"
import { setTimeout } from "timers/promises"

const client = new SuiClient({ url: getFullnodeUrl('testnet') })
const package_id = "0x468678d9c30c988a5b35bccaeaccf2feabfb30a3d0e6f36bad37a984e9d61414" as const

function getSigner(private_key: string): Ed25519Keypair {
    if (private_key === "") {
        throw new Error("private key empty")
    }

    return Ed25519Keypair.fromSecretKey(private_key)
}

async function row_fake_coin(amount: number, signer: Ed25519Keypair): Promise<{
    fake_coin: {
        id: string
    }
}> {
    const tx = new Transaction()

    const fake_coin = tx.moveCall({
        package: package_id,
        module: "paon",
        function: "fake_coin",
        arguments: [
            tx.pure.u8(amount)
        ]
    })

    tx.transferObjects([fake_coin], tx.pure.address(signer.getPublicKey().toSuiAddress()))

    const result = await client.signAndExecuteTransaction({
        signer, transaction: tx, options: {
            showObjectChanges: true,
        }
    })

    if (result.objectChanges == undefined) {
        throw new Error("lock and key yeah!");
    }

    return result.objectChanges
        .filter((object) => object.type === 'created')
        .reduce((pre, cur) => {
            if (cur.objectType.includes("Fake")) {
                pre.fake_coin.id = cur.objectId
                return pre
            }
            return pre
        }, {
            fake_coin: {
                id: ""
            }
        })
}

async function lock_and_key(amount: number, signer: Ed25519Keypair): Promise<{
    object_key: {
        id: string
    }
    object_locked: {
        id: string
    }
}> {
    const tx = new Transaction()

    const [locked, key] = tx.moveCall({
        package: package_id,
        module: "paon",
        function: "lock_fake_coin",
        arguments: [
            tx.pure.u8(amount)
        ]
    })

    tx.transferObjects([locked, key], tx.pure.address(signer.getPublicKey().toSuiAddress()))

    const result = await client.signAndExecuteTransaction({
        signer, transaction: tx, options: {
            showObjectChanges: true,
        }
    })

    if (result.objectChanges == undefined) {
        throw new Error("lock and key yeah!");
    }

    return result.objectChanges
        .filter((object) => object.type === 'created')
        .reduce((pre, cur) => {
            if (cur.objectType.includes("Key")) {
                pre.object_key.id = cur.objectId
                return pre
            }
            if (cur.objectType.includes("Locked")) {
                pre.object_locked.id = cur.objectId
                return pre
            }
            return pre
        }, {
            object_key: {
                id: ""
            },
            object_locked: {
                id: ""
            }
        })
}

async function create_share_escrow(
    locked_id, exchange_id: string,
    signer: Ed25519Keypair, recipient: Ed25519Keypair
) {
    const tx = new Transaction()

    tx.moveCall({
        package: package_id,
        module: "share",
        function: "create",
        typeArguments: [
            `${package_id}::paon::FakeCoin`
        ],
        arguments: [
            tx.object(locked_id),
            tx.object(exchange_id),
            tx.pure.address(recipient.getPublicKey().toSuiAddress()),
        ]
    })

    const result = await client.signAndExecuteTransaction({
        signer, transaction: tx, options: {
            showEffects: true
        }
    })

    const escrow_id = result?.effects?.created?.[0]?.reference?.objectId;

    if (escrow_id == null) {
        throw new Error("dont get escrow");
    }

    return escrow_id
}

async function main() {
    config()

    const mike_signer = getSigner(process.env.PRIVATE_KEY || "")
    const bob_signer = getSigner(process.env.PRIVATE_KEY2 || "")

    const mike_lock_and_key = await lock_and_key(9, mike_signer)
    const bob_fake_coin = await row_fake_coin(88, bob_signer)

    console.log({ mike_lock_and_key })
    console.log({ bob_fake_coin })

    console.log("lock and key")
    await setTimeout(1000 * 5)

    const escrow_id = await create_share_escrow(
        bob_fake_coin.fake_coin.id,
        mike_lock_and_key.object_key.id,
        bob_signer,
        mike_signer,
    )

    console.log({ escrow_id })
    await setTimeout(1000 * 5)

    const tx = new Transaction()

    const ob = tx.moveCall({
        package: package_id,
        module: "share",
        function: "swap",
        typeArguments: [
            `${package_id}::paon::FakeCoin`,
            `${package_id}::paon::FakeCoin`,
        ],
        arguments: [
            tx.object(escrow_id),
            tx.object(mike_lock_and_key.object_key.id),
            tx.object(mike_lock_and_key.object_locked.id)
        ]
    })

    tx.transferObjects([ob], tx.pure.address(mike_signer.getPublicKey().toSuiAddress()))

    const result = await client.signAndExecuteTransaction({ signer: mike_signer, transaction: tx })

    console.log({ result })
}

main().catch(console.log)
