import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3Auth, useWeb3AuthConnect } from '@web3auth/modal/react';
import { useAccount, useWalletClient } from 'wagmi';
import { SLOTS, normalize, paint, pngDataUrl } from '../avatar.js';
import { getAvatar, getUsername, patchProfile } from '../username.js';
import { mintFace } from '../mintFace.js';

export default function Face() {
  const { isConnected } = useWeb3AuthConnect();
  const { web3Auth } = useWeb3Auth();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const canvasRef = useRef(null);
  const kept = useRef({});
  const [traits, setTraits] = useState(() => normalize({}));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const username = getUsername(address);
  const avatar = getAvatar(address);

  useEffect(() => {
    const saved = getAvatar(address);
    if (saved) setTraits(normalize(saved));
  }, [address]);

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, traits).catch((e) => setError(e.message));
  }, [traits]);

  if (!isConnected) return <Navigate to="/" replace />;
  if (address && !username) return <Navigate to="/join" replace />;
  if (address && done) return <Navigate to="/join" replace />;

  function setSlot(id, value) {
    setTraits((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <main className="studio">
      <p className="soon">Create digital yourself. A dropped look cannot be minted again.</p>
      <div className="avatar-stage">
        <canvas ref={canvasRef} className="avatar-canvas" width="512" height="512" />
        <div className="avatar-menu">
          {SLOTS.map((slot) => {
            const on = traits[slot.id] != null;
            return (
              <div key={slot.id} className={on ? 'avatar-row' : 'avatar-row is-off'}>
                <span className="avatar-row-name">{slot.name}</span>
                <div className="avatar-row-controls">
                  {slot.optional ? (
                    <button
                      type="button"
                      className="avatar-toggle"
                      aria-pressed={on}
                      onClick={() => {
                        if (on) {
                          kept.current[slot.id] = traits[slot.id];
                          setSlot(slot.id, null);
                        } else {
                          setSlot(slot.id, kept.current[slot.id] || slot.color);
                        }
                      }}
                    >
                      {on ? 'on' : 'off'}
                    </button>
                  ) : null}
                  {on ? (
                    <label className="avatar-color" style={{ '--swatch': traits[slot.id] || slot.color }}>
                      <input
                        type="color"
                        value={traits[slot.id] || slot.color}
                        onChange={(event) => setSlot(slot.id, event.target.value.toUpperCase())}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {error ? <p className="soon">{error}</p> : null}
      <button
        className="join"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const image = await pngDataUrl(traits);
            const minted = await mintFace({
              web3Auth,
              walletClient,
              address,
              username,
              traits,
              image,
            });
            patchProfile(address, {
              avatar: traits,
              tokenId: minted.tokenId || null,
              tx: minted.tx || null,
              contract: minted.contract || null,
            });
            setDone(true);
          } catch (e) {
            setError(e.message || String(e));
            setBusy(false);
          }
        }}
      >
        {busy ? '…' : 'Keep this face'}
      </button>
    </main>
  );
}
