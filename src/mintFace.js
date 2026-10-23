import { createPublicClient, decodeEventLog, encodeFunctionData, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS, FACE_BYTECODE, FACE_FACTORY, FACE_SALT } from './faceArtifact.js';
import { packTraits } from './facePack.js';

const SEPOLIA_HEX = '0xaa36a7';
const RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

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
  return message;
}

async function ensureSepolia(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX }],
    });
  } catch {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: SEPOLIA_HEX,
          chainName: 'Sepolia',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [RPC],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        },
      ],
    });
  }
}

async function waitReceipt(provider, hash) {
  for (let i = 0; i < 80; i += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('mint timeout');
}

async function send(provider, tx) {
  const hash = await provider.request({
    method: 'eth_sendTransaction',
    params: [tx],
  });
  const receipt = await waitReceipt(provider, hash);
  if (receipt.status !== '0x1') throw new Error('tx failed');
  return { hash, receipt };
}

export async function mintFace({ provider, address, username, traits, image }) {
  if (!address) throw new Error('No wallet');
  if (!provider) throw new Error('No wallet');

  try {
    const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
    const balance = await publicClient.getBalance({ address });
    if (balance === 0n) {
      throw new Error('Need Sepolia ETH on this wallet');
    }

    await ensureSepolia(provider);

    const code = await publicClient.getCode({ address: FACE_ADDRESS });
    if (!code || code === '0x') {
      await send(provider, {
        from: address,
        to: FACE_FACTORY,
        data: FACE_SALT + FACE_BYTECODE.slice(2),
      });
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

    const data = encodeFunctionData({
      abi: FACE_ABI,
      functionName: 'mint',
      args: [on, color, uri],
    });
    const { hash, receipt } = await send(provider, {
      from: address,
      to: FACE_ADDRESS,
      data,
    });

    let tokenId = null;
    for (const log of receipt.logs || []) {
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

    return { tokenId, tx: hash, contract: FACE_ADDRESS };
  } catch (error) {
    throw new Error(explain(error));
  }
}
