import BN from "bn.js"
import { sdk } from "./config"


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
