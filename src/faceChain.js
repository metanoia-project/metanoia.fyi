import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from './faceArtifact.js';

const RPC = 'https://mainnet.base.org';

export const FACE_EXPLORER = `https://basescan.org/nft/${FACE_ADDRESS}`;

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
