import { getBytes, hexlify, keccak256, toUtf8Bytes } from "ethers";

export function encryptIpfsHash(ipfsHash: string, secretAddress: string): `0x${string}` {
  const message = toUtf8Bytes(ipfsHash);
  const key = getBytes(keccak256(secretAddress));
  const cipherBytes = message.map((value, index) => value ^ key[index % key.length]);
  return hexlify(cipherBytes) as `0x${string}`;
}

export function decryptIpfsHash(encryptedHash: string, secretAddress: string): string {
  const key = getBytes(keccak256(secretAddress));
  const cipherBytes = getBytes(encryptedHash);
  const plainBytes = cipherBytes.map((value, index) => value ^ key[index % key.length]);
  const decoder = new TextDecoder();
  return decoder.decode(Uint8Array.from(plainBytes));
}

export function truncateMiddle(value: string, visible = 6): string {
  if (!value) return "";
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

export function formatTimestamp(timestamp: bigint): string {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}
