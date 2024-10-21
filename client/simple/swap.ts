import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { config } from "dotenv"
import { setTimeout } from "timers/promises"

const client = new SuiClient({ url: getFullnodeUrl('testnet') })
const package_id = "0x08d5b85b4b72c14c7cad2c94683b7a66b555c2f05f2c6b8ea191bf9331301c27" as const

function getSigner(private_key: string): Ed25519Keypair {
    if (private_key === "") {
        throw new Error("private key empty")
    }

    return Ed25519Keypair.fromSecretKey(private_key)
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

async function create_escrow(
    key_id: string, locked_id, exchange_id: string,
    signer: Ed25519Keypair, recipient: Ed25519Keypair, custodian: Ed25519Keypair,
) {
    const tx = new Transaction()

    tx.moveCall({
        package: package_id,
        module: "own",
        function: "create",
        typeArguments: [
            `${package_id}::paon::FakeCoin`
        ],
        arguments: [
            tx.object(key_id),
            tx.object(locked_id),
            tx.object(exchange_id),
            tx.pure.address(recipient.getPublicKey().toSuiAddress()),
            tx.pure.address(custodian.getPublicKey().toSuiAddress()),
        ]
    })

    const result = await client.signAndExecuteTransaction({
        signer, transaction: tx, options: {
            showObjectChanges: true
        }
    })

    if (result.objectChanges == undefined) {
        throw new Error("escrow is escrow");
    }

    const escrow = result.objectChanges.find((object) => object.type === "created")

    if (escrow == null || !escrow.objectType.includes("Escrow")) {
        throw new Error("escrow is escrow");
    }

    return escrow.objectId
}

async function main() {
    config()


    const mike_signer = getSigner(process.env.PRIVATE_KEY || "")
    const bob_signer = getSigner(process.env.PRIVATE_KEY2 || "")

    const mike_lock_and_key = await lock_and_key(3, mike_signer)
    const bob_lock_and_key = await lock_and_key(255, bob_signer)

    console.log({ mike_lock_and_key })
    console.log({ bob_lock_and_key })

    console.log("lock and key")
    await setTimeout(1000 * 3)

    const mike_escrow_id = await create_escrow(
        mike_lock_and_key.object_key.id,
        mike_lock_and_key.object_locked.id,
        bob_lock_and_key.object_key.id,
        mike_signer,
        bob_signer,
        mike_signer
    )

    const bob_escrow_id = await create_escrow(
        bob_lock_and_key.object_key.id,
        bob_lock_and_key.object_locked.id,
        mike_lock_and_key.object_key.id,
        bob_signer,
        mike_signer,
        mike_signer
    )

    console.log({ mike_escrow_id })
    console.log({ bob_escrow_id })

    console.log("escrow")
    await setTimeout(1000 * 3)

    const tx = new Transaction()

    tx.moveCall({
        package: package_id,
        module: "own",
        function: "swap",
        typeArguments: [
            `${package_id}::paon::FakeCoin`,
            `${package_id}::paon::FakeCoin`,
        ],
        arguments: [
            tx.object(mike_escrow_id),
            tx.object(bob_escrow_id)
        ]
    })

    const result = await client.signAndExecuteTransaction({ signer: mike_signer, transaction: tx })

    console.log({ result })
}

main().catch(console.log)
