import { createPublicClient, decodeEventLog, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from './faceArtifact.js';
import { packTraits } from './facePack.js';

const SEPOLIA_HEX = '0xaa36a7';
const RPC = 'https://sepolia.drpc.org';

function toDataUri(metadata) {
  const json = JSON.stringify(metadata);
  return 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(json)));
}

function explain(error) {
  const message = error?.shortMessage || error?.message || String(error);
  if (/already exists/i.test(message)) return 'this face already exists';
  if (/already minted/i.test(message)) return 'this wallet already has a face';
  if (/insufficient funds|INSUFFICIENT/i.test(message)) {
    return 'Need Sepolia ETH on this wallet';
  }
  if (/torus|trouble connecting/i.test(message)) {
    return 'Wallet could not reach Sepolia. Try again.';
  }
  return message;
}

export async function mintFace({ web3Auth, walletClient, address, username, traits, image }) {
  if (!address) throw new Error('No wallet');
  if (!walletClient) throw new Error('No wallet');

  try {
    const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });

    try {
      if (web3Auth?.switchChain) {
        await web3Auth.switchChain({ chainId: SEPOLIA_HEX });
      }
    } catch {
      /* already on Sepolia, or dashboard RPC will take the mint */
    }

    const { on, color } = packTraits(traits);
    const look = await publicClient.readContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'hashFace',
      args: [on, color],
    });
    const taken = await publicClient.readContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'idByHash',
      args: [look],
    });
    if (taken !== 0n) throw new Error('this face already exists');

    const owned = await publicClient.readContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'faceOf',
      args: [address],
    });
    if (owned !== 0n) throw new Error('this wallet already has a face');

    const uri = toDataUri({
      name: username,
      description: 'Metanoia face. Once.',
      image,
      attributes: Object.entries(traits)
        .filter(([, value]) => value)
        .map(([trait_type, value]) => ({ trait_type, value })),
    });

    const hash = await walletClient.writeContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'mint',
      args: [on, color, uri],
      account: address,
      chain: sepolia,
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

    if (tokenId) {
      try {
        await walletClient.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC721',
            options: {
              address: FACE_ADDRESS,
              tokenId,
            },
          },
        });
      } catch {
        /* Embedded Wallet NFT tab ignores custom Sepolia tokens */
      }
    }

    return { tokenId, tx: hash, contract: FACE_ADDRESS };
  } catch (error) {
    throw new Error(explain(error));
  }
}
