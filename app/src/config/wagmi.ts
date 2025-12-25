import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Cipher Archive',
  projectId: '20f1f7cde21b4a7b81c8a5e77a257060',
  chains: [sepolia],
  ssr: false,
});
