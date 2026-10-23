import { WEB3AUTH_NETWORK } from '@web3auth/modal';

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;

const web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    defaultChainId: '0x2105',
    walletServicesConfig: {
      whiteLabel: {
        hideNftDisplay: false,
        defaultPortfolio: 'nft',
      },
    },
    uiConfig: {
      appName: 'Μετάνοια',
      mode: 'dark',
      theme: {
        primary: '#ffffff',
        onPrimary: '#000000',
      },
    },
  },
};

export default web3AuthContextConfig;
