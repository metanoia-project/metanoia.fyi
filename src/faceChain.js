import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from './faceArtifact.js';

const RPC = 'https://mainnet.base.org';

export const FACE_EXPLORER = `https://basescan.org/nft/${FACE_ADDRESS}`;

export async function readTokenImage(id) {
  if (!id) return null;
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
  try {
    const data = await publicClient.readContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'imageData',
      args: [BigInt(id)],
    });
    if (data && data.startsWith('data:image')) return data;
  } catch {
    /* old contract without imageData */
  }
  const uri = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'tokenURI',
    args: [BigInt(id)],
  });
  if (uri.startsWith('data:image')) return uri;
  if (uri.startsWith('http')) return `https://metanoia.fyi/nft/${id}.png`;
  return null;
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
