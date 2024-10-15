import BN from "bn.js"
import { sdk } from "./config"
import { adjustForSlippage, d, Percentage } from "@cetusprotocol/cetus-sui-clmm-sdk"

import { Transaction } from '@mysten/sui/transactions'
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { enb } from "../lib/env"
import { resourceUsage } from "process"


export const local = async () => {
    const a2b = false
    const pool = await sdk.Pool.getPool('0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416')
    const byAmountIn = false
    const amount = new BN(8)


    // console.log(pool)

    const swapTicks = await sdk.Pool.fetchTicks({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB
    })

    // console.log("swapTicks length: ", swapTicks.length);

    const res = sdk.Swap.calculateRates({
        decimalsA: 6,
        decimalsB: 6,
        a2b,
        byAmountIn,
        amount,
        swapTicks,
        currentPool: pool
    })

    console.log('calculateRates###res###', {
        estimatedAmountIn: res.estimatedAmountIn.toString(),
        estimatedAmountOut: res.estimatedAmountOut.toString(),
        estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
        estimatedFeeAmount: res.estimatedFeeAmount.toString(),
        isExceed: res.isExceed,
        extraComputeLimit: res.extraComputeLimit,
        amount: res.amount.toString(),
        aToB: res.aToB,
        byAmountIn: res.byAmountIn,
    })

    // console.log('swap: ', transferTxn)
}


export const pre = async () => {
    sdk.senderAddress = enb.address
    const a2b = false
    // fix input token amount
    const coinAmount = new BN(120000)
    // input token amount is token a
    const byAmountIn = false
    // slippage value
    const slippage = Percentage.fromDecimal(d(5))
    // Fetch pool data
    const pool = await sdk.Pool.getPool('0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416')

    const amount = '8'

    // Estimated amountIn amountOut fee
    const res = await sdk.Swap.preswap({
        pool: pool,
        currentSqrtPrice: pool.current_sqrt_price,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        decimalsA: 6, // coin a 's decimals
        decimalsB: 8, // coin b 's decimals
        a2b,
        byAmountIn,
        amount,
    })

    if (res === null) {
        throw new Error("res null");
    }

    console.log({ res })

    // const partner = "0x8e0b7668a79592f70fbfb1ae0aebaf9e2019a7049783b9a4b6fe7c6ae038b528"

    // const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn
    // const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn)

    // // build swap Payload
    // const swapPayload = await sdk.Swap.createSwapTransactionPayload(
    //     {
    //         pool_id: pool.poolAddress,
    //         coinTypeA: pool.coinTypeA,
    //         coinTypeB: pool.coinTypeB,
    //         a2b: a2b,
    //         by_amount_in: byAmountIn,
    //         amount: res.amount.toString(),
    //         amount_limit: amountLimit.toString(),
    //         swap_partner: partner
    //     },
    // )

    // // swapPayload.setSender(enb.address)

    // const client = new SuiClient({ url: getFullnodeUrl('testnet') })

    // const keypair = Ed25519Keypair.fromSecretKey(enb.private_key)

    // const result = await client.signAndExecuteTransaction({
    //     signer: keypair,
    //     transaction: swapPayload,
    //     options: {
    //         showEffects: true
    //     }
    // })

    // console.log({ result })

    // const a = await client.waitForTransaction({ digest: (result).digest })

    // console.log({ a })
}
