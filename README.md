# Commands

## Get last finalized block number

Outputs the last finalized block number. Useful for running multiple commands on the same block.

`docker run --rm taopad:rewards block`

## Distribute tokens

Queries the current snapshot from the graph and distributes the given amount of tokens. An optional block number can be given to snapshot a specific block (must be greater than the one of the last distribution of this token). Outputs the data required to update the distributor contract.

`docker run --rm taopad:rewards distribution:new chain_id token_address amount_in_wei block_number?`

## Get distribution data

Outputs the data required to update the distributor contract.

`docker run --rm taopad:rewards distribution:data chain_id token_address`

## Create a whitelist

Queries the current snapshot from the graph and make a whitelist of tpad holders with the given min balance for the given launchpad. An optional block number can be given to snapshot a specific block. Outputs the data required to update the launchpad contract.

`docker run --rm taopad:rewards whitelist:new chain_id launchpad_address min_tpad_balance_in_wei block_number?`

## Get whitelist data

Outputs the data required to update the launchpad contract.

`docker run --rm taopad:rewards whitelist:data chain_id launchpad_address`

## Check database integrity

Checks all merkle trees for all distributions and all whitelists.

`docker run --rm taopad:rewards check`
