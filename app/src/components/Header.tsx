import { ConnectButton } from "@rainbow-me/rainbowkit";
import "../styles/Header.css";

export function Header() {
  return (
    <header className="ca-header">
      <div className="ca-header__container">
        <div className="ca-brand">
          <div className="ca-logo">CA</div>
          <div>
            <p className="ca-title">Cipher Archive</p>
            <p className="ca-subtitle">Encrypt file locations with Zama FHE</p>
          </div>
        </div>
        <div className="ca-actions">
          <span className="ca-network-pill">Sepolia</span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
