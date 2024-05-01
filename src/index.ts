import yesno from "yesno"
import commander from "commander"
import { isAddress, formatUnits } from "viem"
import { getBlockchain, getBlockInfo, getLaunchpadInfo, getTokenInfo } from "./blockchain"
import { runBlock } from "./commands/block"

const parseBigint = (value: string) => {
    try {
        return BigInt(value)
    }

    catch {
        throw new commander.InvalidArgumentError('Must be parsable as bigint.')
    }
}

const parsePositiveInt = (value: string) => {
    const parsed = parseInt(value)

    if (isNaN(parsed)) {
        throw new commander.InvalidArgumentError('Must be parsable as int.')
    }

    if (parsed > 0) {
        return parsed
    }

    throw new commander.InvalidArgumentError('Must be greater than 0.')
}

const parsePositiveBigint = (value: string) => {
    const parsed = parseBigint(value)

    if (parsed > 0) {
        return parsed
    }

    throw new commander.InvalidArgumentError('Must be greater than 0.')
}

const parseAddress = (value: string) => {
    if (isAddress(value)) {
        return value
    }

    throw new commander.InvalidArgumentError('Must be a value address.')
}

const newDistributionPrompt = async (chain_id: number, token: `0x${string}`, amount_in_wei: bigint, block_number: bigint, snapshots: number, interval: number) => {
    const blockchain = getBlockchain(chain_id)

    const [blockInfo, tokenInfo] = await Promise.all([
        getBlockInfo(block_number),
        getTokenInfo(chain_id, token),
    ])

    console.log(`Chain: ${blockchain.name}`)
    console.log(`Token: ${tokenInfo.name} (${token})`)
    console.log(`Amount: ${formatUnits(amount_in_wei, tokenInfo.decimals)} \$${tokenInfo.symbol}`)
    console.log(`Block number: ${block_number} (${(new Date(Number(blockInfo.timestamp * 1000n))).toUTCString()})`)
    console.log(`Number of snapshots: ${snapshots}`)
    console.log(`Interval between snapshots: ${interval}`)

    return await yesno({ question: 'Are you sure you want to continue?' })
}

const newAllocationPrompt = async (chain_id: number, launchpad: `0x${string}`, amount_in_wei: bigint, block_number: bigint, snapshots: number, interval: number) => {
    const blockchain = getBlockchain(chain_id)

    const info = async () => {
        const launchpadInfo = await getLaunchpadInfo(chain_id, launchpad)
        const tokenInfo = await getTokenInfo(chain_id, launchpadInfo.token)
        return { launchpadInfo, tokenInfo }
    }

    const [blockInfo, { launchpadInfo, tokenInfo }] = await Promise.all([
        getBlockInfo(block_number),
        info(),
    ])

    console.log(`Chain: ${blockchain.name}`)
    console.log(`Launchpad: ${launchpadInfo.name} (${launchpad})`)
    console.log(`Token: ${tokenInfo.name} (${launchpadInfo.token})`)
    console.log(`Amount: ${formatUnits(amount_in_wei, tokenInfo.decimals)} \$${tokenInfo.symbol}`)
    console.log(`Block number: ${block_number} (${(new Date(Number(blockInfo.timestamp * 1000n))).toUTCString()})`)
    console.log(`Number of snapshots: ${snapshots}`)
    console.log(`Interval between snapshots: ${interval}`)

    return await yesno({ question: 'Are you sure you want to continue?' })
}

const program = new commander.Command()

program.name("taopad-cli")
program.version("2.0.0")
program.description("Taopad cli")

program.command("block").action(runBlock)

const distribution = program.command("distribution")

distribution.command("new")
    .description(`
        Distributes the given amount of tokens to holders at the given block number.
        Checks the resulting merkle tree and outputs the data required to update the distributor contract.
    `)
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<token>", "the token address", parseAddress)
    .argument("<amount_in_wei>", "the amount of tokens to distribute", parsePositiveBigint)
    .argument("<block_number>", "the block number of the original snapshot", parsePositiveBigint)
    .argument("<snapshots>", "the number of retrospective snapshot to take", parsePositiveInt)
    .argument("<interval>", "the number of blocks between each retrospective snapshots", parsePositiveInt)
    .action(async (...args: [number, `0x${string}`, bigint, bigint, number, number]) => {
        try {
            if (!await newDistributionPrompt(...args)) {
                throw new Error("terminated by user.")
            }

            console.log("distribution:new", ...args)
        }

        catch (e: any) {
            console.log(e.message)
        }
    })

distribution.command("check")
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<token>", "the token address", parseAddress)
    .argument("<block_number>", "the block number of the original snapshot", parsePositiveBigint)
    .action((...args: [number, `0x${string}`, bigint]) => {
        console.log("distribution:check", ...args)
    })

distribution.command("data")
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<token>", "the token address", parseAddress)
    .action((...args: [number, `0x${string}`]) => {
        console.log("distribution:data", ...args)
    })

const allocation = program.command("allocation")

allocation.command("new")
    .description(`
        Allocates the given amount of tokens to holders at the given block number.
        Checks the resulting merkle tree and outputs the data required to update the launchpad contract.
    `)
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<launchpad>", "the launchpad address", parseAddress)
    .argument("<amount_in_wei>", "the amount of tokens to allocate", parsePositiveBigint)
    .argument("<block_number>", "the block number of the original snapshot", parsePositiveBigint)
    .argument("<snapshots>", "the number of retrospective snapshot to take", parsePositiveInt)
    .argument("<interval>", "the number of blocks between each retrospective snapshots", parsePositiveInt)
    .action(async (...args: [number, `0x${string}`, bigint, bigint, number, number]) => {
        try {
            if (!await newAllocationPrompt(...args)) {
                throw new Error("terminated by user.")
            }

            console.log("allocation:new", ...args)
        }

        catch (e: any) {
            console.log(e.message)
        }
    })


allocation.command("check")
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<launchpad>", "the launchpad address", parseAddress)
    .argument("<block_number>", "the block number of the original snapshot", parsePositiveBigint)
    .action((...args: [number, `0x${string}`, bigint]) => {
        console.log("allocation:check", ...args)
    })

allocation.command("data")
    .argument("<chain_id>", "the token chain id", parsePositiveInt)
    .argument("<launchpad>", "the launchpad address", parseAddress)
    .action((...args: [number, `0x${string}`]) => {
        console.log("allocation:data", ...args)
    })

program.parse(process.argv);
