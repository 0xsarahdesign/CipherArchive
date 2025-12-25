import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { keccak256, Wallet, getBytes, hexlify, toUtf8Bytes } from "ethers";
import { ethers, fhevm } from "hardhat";
import { CipherArchive, CipherArchive__factory } from "../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

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

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CipherArchive")) as CipherArchive__factory;
  const contract = (await factory.deploy()) as CipherArchive;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("CipherArchive", function () {
  let signers: Signers;
  let cipherArchive: CipherArchive;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    ({ contract: cipherArchive, address: contractAddress } = await deployFixture());
  });

  it("stores encrypted file metadata and updates counts", async function () {
    const fileName = "report.pdf";
    const ipfsHash = "QmTestEncryptedHash";
    const secretAddress = Wallet.createRandom().address;
    const encryptedHash = encryptIpfsHash(ipfsHash, secretAddress);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.owner.address)
      .addAddress(secretAddress)
      .encrypt();

    const tx = await cipherArchive
      .connect(signers.owner)
      .storeFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const count = await cipherArchive.getFileCount(signers.owner.address);
    expect(count).to.eq(1n);

    const stored = await cipherArchive.getFile(signers.owner.address, 0);
    expect(stored.fileName).to.eq(fileName);
    expect(stored.owner).to.eq(signers.owner.address);
    expect(stored.encryptedIpfsHash).to.eq(encryptedHash);
  });

  it("allows decrypting the stored secret address to recover the IPFS hash", async function () {
    const fileName = "image.png";
    const ipfsHash = "QmAnotherTestHash";
    const secretAddress = Wallet.createRandom().address;
    const encryptedHash = encryptIpfsHash(ipfsHash, secretAddress);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .addAddress(secretAddress)
      .encrypt();

    const tx = await cipherArchive
      .connect(signers.alice)
      .storeFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const stored = await cipherArchive.getFile(signers.alice.address, 0);

    const clearAddress = await fhevm.userDecryptEaddress(
      stored.encryptedSecretAddress,
      contractAddress,
      signers.alice,
    );
    expect(clearAddress.toLowerCase()).to.eq(secretAddress.toLowerCase());

    const decryptedHash = decryptIpfsHash(stored.encryptedIpfsHash, clearAddress);
    expect(decryptedHash).to.eq(ipfsHash);
  });
});
