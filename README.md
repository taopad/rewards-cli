# Install

`npm install`

`cp .env.example .env`

Complete the .env file with the env values.

## Taking a snapshot

Save a snapshot of holders at the current block to the database.

`npm run snapshot`

## Compute a distribution

Compute distribution of 20k USDC on arbitrum using the last snapshot and save it to the database.

`npm run distribute 42161 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 20000`

## Compute a whitelist

Compute whitelist of >= 1000 holders using the last snapshot and save it to the database.

`npm run whitelist 1000`
