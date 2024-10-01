import { getFaucetHost, requestSuiFromFaucetV0 } from '@mysten/sui/faucet';
import { config } from 'dotenv'
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';


async function main() {
    config()

    const address = process.env.ADDRESS || ''

    if (address === '') {
        throw new Error("require ADDRESS");
    }

    const private_key = process.env.PRIVATE_KEY || ''

    if (private_key === '') {
        throw new Error("require PRIVATE_KEY");
    }

    // console.log(await faucet(address))

    await executeTransaction(address, private_key)
}

async function executeTransaction(address: string, private_key: string) {
    // トランザクションブロックを作成
    const tx = new Transaction()

    const forge = '0x3b3bd2c70cd388a5174cd0d08875677b8be2947422a4e804f13c097b7dd7cb1a';

    const toAddress = address


    // MoveCallを追加
    const sword = tx.moveCall({
        target: '0x822e3339b38be4bb29214bb741b115d02747982bbca19a282d8371a589b3b6bf::example::new_sword',
        arguments: [
            tx.object(forge),   // forgeオブジェクト
            tx.pure.u64(BigInt(3)),
            tx.pure.u64(BigInt(3)),
        ],
    });

    // 移譲 (Transfer) 処理を追加
    tx.transferObjects([sword], tx.pure.address(toAddress));

    // ガスの設定
    tx.setGasBudget(20000000);

    const client = new SuiClient({
        url: "https://fullnode.testnet.sui.io:443"
    });

    const keypair = Ed25519Keypair.fromSecretKey(private_key);

    const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx })

    // トランザクションをサインして送信
    const res = await client.waitForTransaction({ digest: result.digest })


    const result2 = await checkTransactionStatus(client, res.digest)

    console.log(result2)
}


async function checkTransactionStatus(client: SuiClient, digest: string) {
    try {
        // トランザクション結果を取得
        const result = await client.getTransactionBlock({
            digest, options: {
                showEffects: true,
                showEvents: true,
            }
        });

        // トランザクションのステータスを確認
        const status = result.effects?.status;

        if (status === undefined) {
            throw new Error("no one know status");
        }

        if (status.status === 'success') {
            console.log('Transaction succeeded!');
        } else {
            console.log('Transaction failed with error:', status.error);
        }
    } catch (error) {
        console.error('Error fetching transaction status:', error);
    }
}

async function faucet(address: string) {
    const response = await requestSuiFromFaucetV0({
        host: getFaucetHost('testnet'),
        recipient: address,
    })

    return response
}



main().catch(console.log)
