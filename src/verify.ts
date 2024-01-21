import { Snapshot, HolderMap } from "./types"
import { transferEvents } from "./lib/events"
import { writeSnapshot, getHolderMapAt, disconnect } from "./lib/storage"
import { publicClient, TaopadContract, initBlock } from "../config"

const getIsContract = async (address: `0x${string}`) => {
    const bytecode = await publicClient.getBytecode({ address })

    return bytecode !== undefined
}

const getHolderInfo = async (blockNumber: bigint, address: `0x${string}`) => {
    return await publicClient.multicall({
        blockNumber,
        allowFailure: false,
        contracts: [
            {
                ...TaopadContract,
                functionName: "balanceOf",
                args: [address],
            },
            {
                ...TaopadContract,
                functionName: "isBlacklisted",
                args: [address],
            },
        ],
    })
}

const compare = async (blockNumber: bigint, holderMap: HolderMap) => {
    const snapshot1: Snapshot = []
    const snapshot2: Snapshot = []
    const seen: Record<string, boolean> = {}

    const events = transferEvents(initBlock, blockNumber)

    for await (const event of events) {
        const [addr1, addr2] = event.args

        for (const address of [addr1, addr2]) {
            if (!seen[address]) {
                seen[address] = true
                const [balance, isBlacklisted] = await getHolderInfo(blockNumber, address)
                if (balance > 0) {
                    const isContract = await getIsContract(address)

                    const holderInfo = holderMap[address]

                    if (holderInfo.balance !== balance) console.log(`invalid snapshot balance ${address} ${balance} ${holderInfo.balance}`)
                    if (holderInfo.isContract !== isContract) console.log(`invalid snapshot isContract ${address} ${isContract} ${holderInfo.isContract}`)
                    if (holderInfo.isBlacklisted !== isBlacklisted) console.log(`invalid snapshot isBlacklisted ${address} ${isBlacklisted} ${holderInfo.isBlacklisted}`)

                    snapshot1.push({
                        block_number: blockNumber,
                        address,
                        balance: balance.toString(),
                        is_contract: isContract,
                        is_blacklisted: isBlacklisted,
                    })

                    snapshot2.push({
                        block_number: blockNumber,
                        address,
                        balance: holderInfo.balance.toString(),
                        is_contract: holderInfo.isContract,
                        is_blacklisted: holderInfo.isBlacklisted,
                    })
                }
            }
        }
    }

    if (snapshot1.length !== Object.keys(holderMap).length) {
        console.log("invalid snapshot length")
    }

    writeSnapshot(`./data/snapshot-${blockNumber}-1.json`, snapshot1)
    writeSnapshot(`./data/snapshot-${blockNumber}-2.json`, snapshot2)
}

const verify = async () => {
    if (process.argv.length < 3) {
        throw new Error("block number is required")
    }

    const blockNumber = BigInt(process.argv[2])

    const holderMap = await getHolderMapAt(blockNumber)

    if (Object.keys(holderMap).length === 0) {
        throw new Error(`no data for snapshot at block ${blockNumber}`)
    }

    await compare(blockNumber, holderMap)

    console.log("ok")
}

verify()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
