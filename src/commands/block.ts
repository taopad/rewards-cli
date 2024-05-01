import { getLastFinalizedBlock } from "../blockchain"

export const runBlock = async () => {
    const block = await getLastFinalizedBlock()

    console.log("Last finalized block:")
    console.log((new Date(Number(block.timestamp) * 1000)).toUTCString())
    console.log(block.number.toString())
}
