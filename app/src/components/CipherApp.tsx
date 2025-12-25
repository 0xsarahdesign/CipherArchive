import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contracts";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { Header } from "./Header";
import { UploadPanel } from "./UploadPanel";
import { FileList } from "./FileList";
import "../App.css";

export type EncryptedFile = {
  index: number;
  fileName: string;
  encryptedIpfsHash: `0x${string}`;
  encryptedSecretAddress: `0x${string}`;
  owner: string;
  createdAt: bigint;
};

export function CipherApp() {
  const { address } = useAccount();
  const zama = useZamaInstance();
  // const zeroAddress = "0x0000000000000000000000000000000000000000";
  const contractReady = true

  const filesQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "listFiles",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractReady,
    },
  });

  const parsedFiles: EncryptedFile[] = useMemo(() => {
    if (!filesQuery.data) {
      return [];
    }

    const rawFiles = filesQuery.data as any[];
    return rawFiles.map((item, index) => ({
      index,
      fileName: item.fileName ?? item[0],
      encryptedIpfsHash: item.encryptedIpfsHash ?? item[1],
      encryptedSecretAddress: item.encryptedSecretAddress ?? item[2],
      owner: item.owner ?? item[3],
      createdAt: typeof item.createdAt === "bigint" ? item.createdAt : BigInt(item[4] ?? 0),
    }));
  }, [filesQuery.data]);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-body">
        <div className="app-grid">
          <UploadPanel
            address={address}
            onStored={() => filesQuery.refetch?.()}
            isLoadingFiles={filesQuery.isFetching}
            zamaInstance={zama.instance}
            zamaLoading={zama.isLoading}
            zamaError={zama.error}
            contractReady={contractReady}
          />
          <FileList
            files={parsedFiles}
            isLoading={filesQuery.isFetching}
            onRefresh={() => filesQuery.refetch?.()}
            zamaInstance={zama.instance}
            zamaLoading={zama.isLoading}
            contractReady={contractReady}
            readError={
              contractReady ? (filesQuery.error as Error | undefined) : new Error("Set CONTRACT_ADDRESS in config.")
            }
          />
        </div>
      </main>
    </div>
  );
}
