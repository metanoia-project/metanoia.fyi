import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from './faceArtifact.js';

const RPC = 'https://mainnet.base.org';

export const FACE_EXPLORER = `https://basescan.org/nft/${FACE_ADDRESS}`;

export async function readTokenImage(id) {
  if (!id) return null;
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
  const uri = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'tokenURI',
    args: [BigInt(id)],
  });
  let json = uri;
  if (uri.startsWith('data:application/json;base64,')) {
    json = atob(uri.slice('data:application/json;base64,'.length));
  } else if (uri.startsWith('data:application/json,')) {
    json = decodeURIComponent(uri.slice('data:application/json,'.length));
  } else if (uri.startsWith('http')) {
    const res = await fetch(uri);
    json = await res.text();
  }
  try {
    const meta = JSON.parse(json);
    return meta.image || null;
  } catch {
    return null;
  }
}

export async function readFaceId(address) {
  if (!address) return null;
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
  const code = await publicClient.getCode({ address: FACE_ADDRESS });
  if (!code || code === '0x') return null;
  const id = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'faceOf',
    args: [address],
  });
  return id === 0n ? null : String(id);
}
