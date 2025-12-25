import { useState } from "react";
import { Contract, Wallet } from "ethers";

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contracts";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { encryptIpfsHash, truncateMiddle } from "../utils/encryption";
import { mockUploadToIpfs } from "../utils/ipfs";
import "../styles/UploadPanel.css";

type UploadPanelProps = {
  address?: string;
  onStored?: () => void;
  isLoadingFiles?: boolean;
  zamaInstance?: any;
  zamaLoading?: boolean;
  zamaError?: string | null;
  contractReady?: boolean;
};

export function UploadPanel({
  address,
  onStored,
  isLoadingFiles,
  zamaInstance,
  zamaLoading,
  zamaError,
  contractReady,
}: UploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ipfsHash, setIpfsHash] = useState("");
  const [secretAddress, setSecretAddress] = useState("");
  const [encryptedHash, setEncryptedHash] = useState<`0x${string}` | "">("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const signerPromise = useEthersSigner();

  const reset = () => {
    setSelectedFile(null);
    setIpfsHash("");
    setSecretAddress("");
    setEncryptedHash("");
    setUploadProgress(0);
    setStatusMessage("");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setUploadProgress(0);
    setIpfsHash("");
    setSecretAddress("");
    setEncryptedHash("");
    setStatusMessage(file ? "Ready to upload" : "");
  };

  const handleUploadToIpfs = async () => {
    if (!selectedFile) {
      setStatusMessage("Select a file first.");
      return;
    }

    setIsUploading(true);
    setStatusMessage("Creating mock IPFS hash...");

    try {
      const result = await mockUploadToIpfs(selectedFile, setUploadProgress);
      const generatedSecret = Wallet.createRandom().address;
      const encrypted = encryptIpfsHash(result.hash, generatedSecret);

      setIpfsHash(result.hash);
      setSecretAddress(generatedSecret);
      setEncryptedHash(encrypted);
      setStatusMessage("Encrypted hash is ready. Save it on-chain to persist.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to create IPFS hash.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStore = async () => {
    if (!address) {
      setStatusMessage("Connect your wallet first.");
      return;
    }
    if (!contractReady) {
      setStatusMessage("Set the deployed contract address in src/config/contracts.ts.");
      return;
    }
    if (!selectedFile || !ipfsHash || !encryptedHash || !secretAddress) {
      setStatusMessage("Upload and encrypt a file before saving.");
      return;
    }
    if (!zamaInstance) {
      setStatusMessage("Encryption service is still starting...");
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setStatusMessage("Wallet signer unavailable.");
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage("Encrypting secret address with Zama...");

      const input = zamaInstance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.addAddress(secretAddress);
      const encryptedInput = await input.encrypt();

      setStatusMessage("Submitting transaction...");
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.storeFile(
        selectedFile.name,
        encryptedHash,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
      );
      await tx.wait();

      setStatusMessage("Saved to chain successfully.");
      onStored?.();
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to store encrypted data.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Upload & encrypt</p>
          <h2 className="panel__title">Protect IPFS hashes with a secret address</h2>
          <p className="panel__subtitle">
            Generate a pseudo IPFS hash, encrypt it locally with a random address, then lock the address on-chain
            using Zama FHE.
          </p>
        </div>
        <div className="status-chip">{zamaLoading ? "Starting relayer..." : "Relayer ready"}</div>
      </div>

      <div className="panel__body">
        <div className="input-row">
          <label className="input-label">Choose a file</label>
          <input type="file" onChange={handleFileChange} className="file-input" />
          {selectedFile ? <p className="hint">{selectedFile.name}</p> : <p className="hint">Max 5MB recommended</p>}
        </div>

        <div className="actions">
          <button className="ghost-btn" onClick={reset} disabled={isUploading || isSaving}>
            Reset
          </button>
          <div className="action-group">
            <button
              className="secondary-btn"
              onClick={handleUploadToIpfs}
              disabled={isUploading || !!ipfsHash || !selectedFile}
            >
              {isUploading ? "Uploading..." : "Mock IPFS upload"}
            </button>
            <button
              className="primary-btn"
              onClick={handleStore}
              disabled={
                isSaving ||
                isUploading ||
                !ipfsHash ||
                !encryptedHash ||
                !secretAddress ||
                !address ||
                zamaLoading ||
                !!zamaError ||
                !contractReady
              }
            >
              {isSaving ? "Saving..." : "Save to chain"}
            </button>
          </div>
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress">
            <div className="progress__bar" style={{ width: `${uploadProgress}%` }} />
            <span className="progress__label">{uploadProgress}%</span>
          </div>
        )}

        {(ipfsHash || encryptedHash || secretAddress) && (
          <div className="summary">
            <div>
              <p className="summary__label">IPFS hash</p>
              <p className="summary__value">{ipfsHash}</p>
            </div>
            <div>
              <p className="summary__label">Secret address</p>
              <p className="summary__value">{truncateMiddle(secretAddress)}</p>
            </div>
            <div>
              <p className="summary__label">Encrypted hash</p>
              <p className="summary__value monospace">{truncateMiddle(encryptedHash, 10)}</p>
            </div>
          </div>
        )}

        <p className="status-line">{statusMessage || "Upload, encrypt, then store to persist."}</p>
        {zamaError ? <p className="error-line">Relayer error: {zamaError}</p> : null}
        {isLoadingFiles ? <p className="hint">Refreshing your saved files...</p> : null}
      </div>
    </section>
  );
}
