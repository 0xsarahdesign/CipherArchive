const IPFS_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomChar(): string {
  const index = Math.floor(Math.random() * IPFS_ALPHABET.length);
  return IPFS_ALPHABET[index]!;
}

export function generateMockIpfsHash(): string {
  const length = 46;
  let result = "Qm";
  for (let i = 0; i < length - 2; i += 1) {
    result += randomChar();
  }
  return result;
}

export async function mockUploadToIpfs(file: File, onProgress?: (progress: number) => void) {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  onProgress?.(18);
  await delay(300);
  onProgress?.(52);
  await delay(300);
  onProgress?.(78);
  await delay(250);
  onProgress?.(100);

  return {
    hash: generateMockIpfsHash(),
    size: file.size,
  };
}
