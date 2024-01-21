import { parseAbiItem } from "viem"

import { TaopadContract } from "../../config/contracts"
import { publicClient, batchSize } from "../../config/values"

function* blockRanges(fromBlock: bigint, toBlock: bigint) {
    if (toBlock < fromBlock) {
        throw new Error("invalid block number range")
    }

    const numberOfBlocks = toBlock - fromBlock

    const nbChunks = numberOfBlocks / batchSize

    for (let i = 0; i < nbChunks; i++) {
        const a = fromBlock + (BigInt(i) * batchSize)
        const b = a + batchSize - 1n
        yield [a, b]
    }

    const a = fromBlock + (nbChunks * batchSize)
    const b = toBlock
    yield [a, b]
}

export async function* transferEvents(fromBlock: bigint, toBlock: bigint) {
    const ranges = blockRanges(fromBlock, toBlock)

    for (const [fromBlock, toBlock] of ranges) {
        console.log(fromBlock, toBlock)

        const events = await publicClient.getLogs({
            ...TaopadContract,
            fromBlock,
            toBlock,
            event: parseAbiItem("event Transfer(address indexed, address indexed, uint256)"),
            strict: true
        })

        for (let i = 0; i < events.length; i++) {
            yield events[i]
        }
    }
}
