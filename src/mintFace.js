import { createPublicClient, createWalletClient, decodeEventLog, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FACE_ABI } from './faceAbi.js';

const FACE_ADDRESS = import.meta.env.VITE_FACE_NFT_ADDRESS;
const LOCAL_MINTER =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function toDataUri(metadata) {
  const json = JSON.stringify(metadata);
  return 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(json)));
}

function localChain() {
  const rpc = `${window.location.origin}/hardhat`;
  return defineChain({
    id: 31337,
    name: 'Metanoia local',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  });
}

export async function mintFace({ address, username, traits, image }) {
  if (!FACE_ADDRESS) throw new Error('No face contract');
  if (!address) throw new Error('No wallet');

  const chain = localChain();
  const transport = http(chain.rpcUrls.default.http[0]);
  const account = privateKeyToAccount(LOCAL_MINTER);
  const wallet = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  const uri = toDataUri({
    name: username,
    description: 'Metanoia face. Once.',
    image,
    attributes: Object.entries(traits)
      .filter(([, value]) => value)
      .map(([trait_type, value]) => ({ trait_type, value })),
  });

  const hash = await wallet.writeContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'mintTo',
    args: [address, uri],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('mint failed');

  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({
        abi: FACE_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (parsed.eventName === 'Transfer') {
        tokenId = String(parsed.args.tokenId);
        break;
      }
    } catch {
      /* other logs */
    }
  }

  return {
    tokenId,
    tx: hash,
    contract: FACE_ADDRESS,
  };
}
