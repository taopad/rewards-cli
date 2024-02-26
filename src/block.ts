import { blockchain } from "./lib/blockchain"

const block = async () => {
    const blockNumber = await blockchain.lastBlockNumber()
    const timestamp = await blockchain.blockTimestamp(blockNumber)

    console.log("Last finalized block:")
    console.log((new Date(Number(timestamp) * 1000)).toUTCString())
    console.log(blockNumber.toString())
}

block()
