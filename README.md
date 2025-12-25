# CipherArchive

CipherArchive is a privacy-first on-chain index for file references. It stores the file name, an encrypted IPFS hash, and a Zama FHE-encrypted secret address so users can later decrypt the address and recover the original hash without ever exposing it on-chain.

## Overview

Traditional file registries put raw hashes on-chain, making content discoverable and linkable. CipherArchive keeps file pointers private while still enabling verifiable ownership and access control. It uses a locally generated EVM address as a secret key to encrypt the hash, then stores that address as an `eaddress` so only approved users can decrypt it via the Zama relayer.

## Problems Solved

- Prevents public exposure of IPFS hashes while still keeping an on-chain index of file references.
- Allows the file owner to control who can recover the secret used to decrypt the hash.
- Keeps decryption and file access entirely client-side, avoiding centralized custody or servers.
- Preserves auditability: file metadata exists on-chain, but the content pointer remains private.

## Key Advantages

- End-to-end privacy for the content pointer (IPFS hash never appears in plaintext on-chain).
- Explicit access control by granting decrypt permission for each stored entry.
- Lightweight on-chain data model: small encrypted payloads plus metadata.
- Client-only encryption and decryption flow; no trusted middleware required.
- Compatible with Zama FHE tooling to manage secret address privacy.

## How It Works

1. The user selects a local file.
2. The app generates a pseudo IPFS hash (random hash for demo purposes).
3. The app creates a random EVM address `A` locally.
4. The IPFS hash is encrypted with `A` (XOR with `keccak256(A)`).
5. `A` is encrypted with the Zama relayer SDK to an `externalEaddress`.
6. The app stores `fileName`, `encryptedIpfsHash`, and the encrypted address on-chain via `storeFile`.
7. When the user requests decryption, the relayer returns the plaintext `A`.
8. The client decrypts the IPFS hash with `A` and can access the file.

## Encryption Details

- IPFS hash encryption: XOR with `keccak256(secretAddress)`.
- Secret key: a randomly generated EVM address `A` (never stored in plaintext on-chain).
- On-chain storage: `eaddress` created by Zama relayer with proof validation.
- Access control: `FHE.allow` grants decryption permission per address.

## On-Chain Data Model

`StoredFile` contains:
- `fileName` (string)
- `encryptedIpfsHash` (bytes)
- `encryptedSecretAddress` (eaddress)
- `owner` (address)
- `createdAt` (uint256)

## Contracts

- `contracts/CipherArchive.sol`: Main contract storing encrypted metadata. View functions take explicit `owner` arguments (no `msg.sender` usage in view methods).
- `deploy/deploy.ts`: Hardhat deploy script for local node and Sepolia.
- `tasks/cipherArchive.ts`: CLI tasks for storing, listing, and decrypting entries.

## Tech Stack

- Smart contracts: Hardhat, Solidity, Zama FHE (eaddress)
- Frontend: React + Vite + RainbowKit + viem (reads) + ethers (writes)
- Package manager: npm

## Repository Layout

- `contracts/` smart contracts
- `deploy/` deployment scripts
- `tasks/` Hardhat tasks
- `test/` contract tests
- `app/` frontend application (no Tailwind)
- `deployments/` deployed contract artifacts and ABIs

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` for Hardhat (private key only, no mnemonic):

```bash
PRIVATE_KEY=<sepolia_private_key>
INFURA_API_KEY=<infura_api_key>
ETHERSCAN_API_KEY=<optional_etherscan_key>
```

3. Compile and test:

```bash
npm run compile
npm run test
```

## Deploy

```bash
# Local mock FHE network
npm run deploy:localhost

# Sepolia (requires PRIVATE_KEY + funds)
npm run deploy:sepolia
```

## Tasks

```bash
npx hardhat task:address --network <network>
npx hardhat task:store-file --name "report.pdf" --hash Qm123... --network <network>
npx hardhat task:list-files --network <network>
npx hardhat task:decrypt-file --index 0 --network <network>
```

## Frontend (app/)

- The frontend uses the deployed address from `deployments/sepolia` and does not rely on environment variables.
- ABI must be copied from `deployments/sepolia/CipherArchive.json` into a TypeScript file in `app/src` (no `.json` usage in the frontend).
- Reads use viem (`useReadContract`); writes use ethers `Contract`.
- The UI covers local file selection, pseudo IPFS hashing, local encryption, on-chain storage, and relayer-driven decryption.

Run:

```bash
cd app
npm install
npm run dev
```

## Security Model

- The IPFS hash is never stored in plaintext on-chain.
- The secret address used for encryption is stored as an `eaddress` and only decrypted by approved addresses.
- The contract validates the relayer proof before accepting the encrypted address.
- All decryption happens client-side; the contract never sees plaintext secrets.

## Limitations

- The IPFS upload is a demo placeholder; it generates a random hash instead of uploading real files.
- No on-chain file content is stored; only encrypted references.
- Access control is per-entry; there is no global role system.

## Future Roadmap

- Replace pseudo IPFS with real IPFS or storage provider integration.
- Add optional encryption of the file itself before upload.
- Support batch uploads and batch permission grants.
- Add indexed search and tagging without revealing private hashes.
- Add richer audit logs and per-entry activity history.
- Improve UX around key recovery and multi-device usage.
- Explore off-chain indexers for faster queries while keeping privacy guarantees.

