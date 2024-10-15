import { local, pre } from "./preswap"

/**
 * @doc https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk/features-available
 */

async function main() {

    await local()

    await pre()
}


main().catch(console.log)
