import { useEffect, useRef, useState } from 'react';
import { useWeb3Auth, useWeb3AuthConnect, useWeb3AuthDisconnect } from '@web3auth/modal/react';
import { useAccount, useWalletClient } from 'wagmi';
import { Link, Navigate } from 'react-router-dom';
import { paint } from '../avatar.js';
import { FACE_EXPLORER, readFaceId, readTokenImage } from '../faceChain.js';
import { dropFace } from '../mintFace.js';
import { getAvatar, getUsername, parseUsername, patchProfile, setUsername } from '../username.js';

function FacePreview({ traits }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && traits) paint(ref.current, traits);
  }, [traits]);
  return <canvas ref={ref} className="avatar-canvas" width="512" height="512" />;
}

export default function Join() {
  const { connect, loading, isConnected, error } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const { web3Auth } = useWeb3Auth();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [chainId, setChainId] = useState(undefined);
  const [tokenImage, setTokenImage] = useState(null);
  const [busy, setBusy] = useState(false);

  const username =
    address && saved?.address === address.toLowerCase()
      ? saved.username
      : getUsername(address);
  const avatar = getAvatar(address);
  const tokenId = chainId;

  useEffect(() => {
    if (!address) return undefined;
    let live = true;
    readFaceId(address)
      .then((id) => {
        if (!live) return;
        if (id) {
          patchProfile(address, { tokenId: id });
          readTokenImage(id).then((image) => {
            if (live) setTokenImage(image);
          });
        }
        setChainId(id);
      })
      .catch(() => {
        if (live) setChainId(null);
      });
    return () => {
      live = false;
    };
  }, [address]);

  if (!isConnected) {
    return (
      <main className="screen">
        <button className="join" type="button" onClick={() => connect()} disabled={loading}>
          {loading ? '…' : 'Join'}
        </button>
        {error ? <p className="soon">{error.message || String(error)}</p> : null}
      </main>
    );
  }

  if (!address) {
    return (
      <main className="screen">
        <p className="soon">…</p>
      </main>
    );
  }

  if (!username) {
    return (
      <main className="screen">
        <form
          className="joined"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = parseUsername(draft);
            if (parsed.error) {
              setFormError(parsed.error);
              return;
            }
            setUsername(address, parsed.username);
            setSaved({ address: address.toLowerCase(), username: parsed.username });
          }}
        >
          <label className="soon" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="username"
            name="username"
            autoComplete="username"
            autoFocus
            maxLength={24}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setFormError('');
            }}
          />
          {formError ? <p className="soon">{formError}</p> : null}
          <button className="join" type="submit">
            Enter
          </button>
        </form>
      </main>
    );
  }

  if (chainId === undefined) {
    return (
      <main className="screen">
        <p className="soon">…</p>
      </main>
    );
  }

  if (!tokenId) {
    return <Navigate to="/face" replace />;
  }

  return (
    <main className="studio">
      <div className="joined">
        {tokenImage ? (
          <img className="avatar-canvas" src={tokenImage} alt="" />
        ) : avatar ? (
          <FacePreview traits={avatar} />
        ) : (
          <img className="avatar-canvas" src={`/nft/${tokenId}.png`} alt="" />
        )}
        <p className="soon">{username}</p>
        <p className="soon">face #{tokenId}</p>
        <a className="soon" href={`${FACE_EXPLORER}/${tokenId}`} target="_blank" rel="noreferrer">
          Basescan
        </a>
        <p className="soon">{address}</p>
        {formError ? <p className="soon">{formError}</p> : null}
        <button
          className="join"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFormError('');
            try {
              await dropFace({ web3Auth, walletClient, address, tokenId });
              patchProfile(address, { tokenId: null, avatar: getAvatar(address) });
              setTokenImage(null);
              setChainId(null);
            } catch (e) {
              setFormError(e.message || String(e));
              setBusy(false);
            }
          }}
        >
          {busy ? '…' : 'Drop this face'}
        </button>
        <button className="join" type="button" onClick={() => disconnect()}>
          Leave
        </button>
        <Link className="join" to="/">
          Home
        </Link>
      </div>
    </main>
  );
}
