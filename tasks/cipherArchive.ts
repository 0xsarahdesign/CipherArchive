import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { Wallet, keccak256, getBytes, hexlify, toUtf8Bytes } from "ethers";

function encryptIpfsHash(ipfsHash: string, secretAddress: string): string {
  const message = toUtf8Bytes(ipfsHash);
  const key = getBytes(keccak256(secretAddress));
  const cipherBytes = message.map((value, index) => value ^ key[index % key.length]);
  return hexlify(cipherBytes);
}

function decryptIpfsHash(encryptedHash: string, secretAddress: string): string {
  const key = getBytes(keccak256(secretAddress));
  const cipherBytes = getBytes(encryptedHash);
  const plainBytes = cipherBytes.map((value, index) => value ^ key[index % key.length]);
  const decoder = new TextDecoder();
  return decoder.decode(Uint8Array.from(plainBytes));
}

task("task:address", "Prints the CipherArchive address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const cipherArchive = await deployments.get("CipherArchive");
  console.log("CipherArchive address is " + cipherArchive.address);
});

task("task:store-file", "Encrypts and stores a file reference")
  .addParam("name", "Filename to store")
  .addParam("hash", "Plain IPFS hash string")
  .addOptionalParam("secret", "Optional secret address to use instead of a random one")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const cipherArchive = await deployments.get("CipherArchive");
    const signer = (await ethers.getSigners())[0];

    const secretAddress: string = taskArguments.secret ?? Wallet.createRandom().address;
    const encryptedHash = encryptIpfsHash(taskArguments.hash, secretAddress);

    const encryptedInput = await fhevm
      .createEncryptedInput(cipherArchive.address, signer.address)
      .addAddress(secretAddress)
      .encrypt();

    const contract = await ethers.getContractAt("CipherArchive", cipherArchive.address);
    const tx = await contract
      .connect(signer)
      .storeFile(taskArguments.name, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Submitting storeFile... tx=${tx.hash}`);
    await tx.wait();
    console.log(`Stored ${taskArguments.name} using secret ${secretAddress}`);
  });

task("task:list-files", "Lists encrypted files for an address")
  .addOptionalParam("owner", "Owner address, defaults to first signer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const cipherArchive = await deployments.get("CipherArchive");
    const signer = (await ethers.getSigners())[0];
    const owner: string = taskArguments.owner ?? signer.address;

    const contract = await ethers.getContractAt("CipherArchive", cipherArchive.address);
    const count = await contract.getFileCount(owner);
    console.log(`Found ${count} file(s) for ${owner}`);

    for (let i = 0n; i < count; i++) {
      const file = await contract.getFile(owner, i);
      console.log(
        `[${i}] name=${file.fileName} encryptedHash=${file.encryptedIpfsHash} encryptedAddress=${file.encryptedSecretAddress}`,
      );
    }
  });

task("task:decrypt-file", "Decrypts the secret address and IPFS hash for a stored file")
  .addParam("index", "File index to decrypt")
  .addOptionalParam("owner", "Owner address, defaults to first signer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const cipherArchive = await deployments.get("CipherArchive");
    const signer = (await ethers.getSigners())[0];
    const owner: string = taskArguments.owner ?? signer.address;
    const fileIndex = BigInt(taskArguments.index);

    const contract = await ethers.getContractAt("CipherArchive", cipherArchive.address);
    const file = await contract.getFile(owner, fileIndex);

    const secretAddress = await fhevm.userDecryptEaddress(file.encryptedSecretAddress, cipherArchive.address, signer);
    const ipfsHash = decryptIpfsHash(file.encryptedIpfsHash, secretAddress);

    console.log(`Decrypted file #${fileIndex} for ${owner}`);
    console.log(`  Filename: ${file.fileName}`);
    console.log(`  Secret address: ${secretAddress}`);
    console.log(`  IPFS hash: ${ipfsHash}`);
  });
