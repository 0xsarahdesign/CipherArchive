import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { CONTRACT_ADDRESS } from "../config/contracts";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { decryptIpfsHash, formatTimestamp, truncateMiddle } from "../utils/encryption";
import type { EncryptedFile } from "./CipherApp";
import "../styles/FileList.css";

type FileListProps = {
  files: EncryptedFile[];
  isLoading: boolean;
  onRefresh?: () => void;
  zamaInstance?: any;
  zamaLoading?: boolean;
  readError?: Error;
  contractReady?: boolean;
};

type DecryptedData = {
  secretAddress: string;
  ipfsHash: string;
};

export function FileList({ files, isLoading, onRefresh, zamaInstance, zamaLoading, readError, contractReady }: FileListProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const [decryptingIndex, setDecryptingIndex] = useState<number | null>(null);
  const [decrypted, setDecrypted] = useState<Record<number, DecryptedData>>({});
  const [error, setError] = useState("");

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => Number(b.createdAt - a.createdAt));
  }, [files]);

  const handleDecrypt = async (file: EncryptedFile) => {
    setError("");
    if (!zamaInstance) {
      setError("Encryption runtime not ready yet.");
      return;
    }
    if (!address) {
      setError("Connect your wallet to decrypt.");
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setError("Wallet signer unavailable.");
      return;
    }

    try {
      setDecryptingIndex(file.index);
      const keypair = zamaInstance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "7";
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = zamaInstance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await zamaInstance.userDecrypt(
        [
          {
            handle: file.encryptedSecretAddress,
            contractAddress: CONTRACT_ADDRESS,
          },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimestamp,
        durationDays,
      );

      const clearAddress = result[file.encryptedSecretAddress] as string;
      const clearHash = decryptIpfsHash(file.encryptedIpfsHash, clearAddress);

      setDecrypted((prev) => ({
        ...prev,
        [file.index]: {
          secretAddress: clearAddress,
          ipfsHash: clearHash,
        },
      }));
    } catch (err) {
      console.error(err);
      setError("Unable to decrypt this entry.");
    } finally {
      setDecryptingIndex(null);
    }
  };

  return (
    <section className="panel secondary">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Your encrypted files</p>
          <h2 className="panel__title">Decrypt IPFS hashes when you need them</h2>
          <p className="panel__subtitle">
            We store the encrypted hash and FHE-locked secret address. Use the relayer to recover the IPFS hash.
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost-btn" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </button>
          <span className="status-chip muted">{`${files.length} saved`}</span>
        </div>
      </div>

      {!address ? (
        <div className="empty-state">
          <p className="empty-title">Connect your wallet to view encrypted files.</p>
        </div>
      ) : null}

      {address && !files.length && !isLoading ? (
        <div className="empty-state">
          <p className="empty-title">No encrypted files yet.</p>
          <p className="hint">Upload a file on the left to populate your archive.</p>
        </div>
      ) : null}

      {isLoading ? <p className="hint">Loading encrypted records...</p> : null}

      {error ? <p className="error-line">{error}</p> : null}
      {readError ? (
        <p className="error-line">Unable to read contract data. Confirm the contract address is deployed on Sepolia.</p>
      ) : null}
      {!contractReady ? (
        <p className="error-line">
          Update CONTRACT_ADDRESS in src/config/contracts.ts to the deployed CipherArchive address before interacting.
        </p>
      ) : null}

      <div className="file-grid">
        {sortedFiles.map((file) => {
          const decryptedInfo = decrypted[file.index];
          return (
            <div key={file.index} className="file-card">
              <div className="file-card__header">
                <div>
                  <p className="file-name">{file.fileName}</p>
                  <p className="file-meta">
                    {formatTimestamp(file.createdAt)} · owner {truncateMiddle(file.owner)}
                  </p>
                </div>
                <button
                  className="secondary-btn compact"
                  onClick={() => handleDecrypt(file)}
                  disabled={zamaLoading || decryptingIndex === file.index || !contractReady}
                >
                  {decryptingIndex === file.index ? "Decrypting..." : "Decrypt"}
                </button>
              </div>

              <div className="file-row">
                <span className="label">Encrypted IPFS hash</span>
                <span className="monospace">{truncateMiddle(file.encryptedIpfsHash, 12)}</span>
              </div>
              <div className="file-row">
                <span className="label">Encrypted secret address</span>
                <span className="monospace">{truncateMiddle(file.encryptedSecretAddress, 12)}</span>
              </div>

              {decryptedInfo ? (
                <div className="decrypted-box">
                  <div className="file-row">
                    <span className="label">Decrypted address</span>
                    <span className="monospace">{decryptedInfo.secretAddress}</span>
                  </div>
                  <div className="file-row">
                    <span className="label">Recovered IPFS hash</span>
                    <span className="monospace">{decryptedInfo.ipfsHash}</span>
                  </div>
                </div>
              ) : (
                <p className="hint">Decrypt to reveal the secret address and IPFS hash.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
