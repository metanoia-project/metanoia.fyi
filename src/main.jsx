import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Web3AuthProvider } from '@web3auth/modal/react';
import { WagmiProvider } from '@web3auth/modal/react/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import web3AuthContextConfig from './web3authContext.js';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  </StrictMode>,
);
