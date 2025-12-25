# CipherArchive Frontend

React + Vite + RainbowKit UI for encrypting IPFS hashes and storing references on-chain with Zama FHE.

## Features

- Connect wallet (RainbowKit on Sepolia), no environment variables.
- Upload a file, generate a pseudo IPFS hash, encrypt it locally with a random address.
- Encrypt the secret address with the relayer SDK and store via ethers `storeFile`.
- List saved entries with viem reads and decrypt the address/IPFS hash client-side.

## Setup

1. Set the deployed contract address in `src/config/contracts.ts` using `deployments/sepolia/CipherArchive.json`.
2. Install dependencies and run:

   ```bash
   npm install
   npm run dev
   # build
   npm run build
   ```

The UI avoids local storage, Tailwind, and environment variables. Writes use ethers; reads use viem.
