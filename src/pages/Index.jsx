import { useWeb3AuthConnect } from '@web3auth/modal/react';
import { useAccount } from 'wagmi';
import { Navigate } from 'react-router-dom';

export default function Index() {
  const { connect, loading, isConnected, error } = useWeb3AuthConnect();
  const { address } = useAccount();

  if (isConnected) {
    return <Navigate to="/join" replace />;
  }

  return (
    <main className="screen">
      <button className="join" type="button" onClick={() => connect()} disabled={loading}>
        {loading ? '…' : 'Join'}
      </button>
      {error ? <p className="soon">{error.message || String(error)}</p> : null}
      {address ? <p className="soon">{address}</p> : null}
    </main>
  );
}
