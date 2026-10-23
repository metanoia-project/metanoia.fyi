import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from './faceArtifact.js';

const RPC = 'https://sepolia.drpc.org';

export const FACE_EXPLORER = `https://sepolia.etherscan.io/nft/${FACE_ADDRESS}`;

export async function readFaceId(address) {
  if (!address) return null;
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const id = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'faceOf',
    args: [address],
  });
  return id === 0n ? null : String(id);
}
