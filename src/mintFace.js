import { createPublicClient, decodeEventLog, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS, FACE_BYTECODE, FACE_FACTORY, FACE_SALT } from './faceArtifact.js';
import { packTraits } from './facePack.js';

const BASE_HEX = '0x2105';
const RPC = 'https://mainnet.base.org';
const DROP_TO = '0x98c0Bb4dc2BaE6D33267910c5F1bD3EbA06a84db';

function toDataUri(metadata) {
  const json = JSON.stringify(metadata);
  return 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(json)));
}

function explain(error) {
  const message = error?.shortMessage || error?.message || String(error);
  if (/already exists/i.test(message)) return 'this face already exists';
  if (/already minted/i.test(message)) return 'this wallet already has a face';
  if (/insufficient funds|INSUFFICIENT/i.test(message)) {
    return 'Need a little Base ETH on this wallet';
  }
  if (/torus|trouble connecting/i.test(message)) {
    return 'Wallet could not reach Base. Enable Base in the Embedded Wallets dashboard, then try again.';
  }
  return message;
}

export async function mintFace({ web3Auth, walletClient, address, username, traits, image }) {
  if (!address) throw new Error('No wallet');
  if (!walletClient) throw new Error('No wallet');

  try {
    const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

    try {
      if (web3Auth?.switchChain) {
        await web3Auth.switchChain({ chainId: BASE_HEX });
      }
    } catch {
      /* already on Base, or dashboard RPC will take the mint */
    }

    const code = await publicClient.getCode({ address: FACE_ADDRESS });
    if (!code || code === '0x') {
      const deployHash = await walletClient.sendTransaction({
        account: address,
        chain: base,
        to: FACE_FACTORY,
        data: FACE_SALT + FACE_BYTECODE.slice(2),
      });
      const deployed = await publicClient.waitForTransactionReceipt({ hash: deployHash });
      if (deployed.status !== 'success') throw new Error('deploy failed');
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

    const nextId = await publicClient.readContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'nextId',
    });
    const uri = toDataUri({
      name: username,
      description: 'Metanoia face. Once.',
      image: `https://metanoia.fyi/nft/${nextId}.png`,
      image_data: image,
      external_url: 'https://metanoia.fyi',
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
      chain: base,
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

    return { tokenId, tx: hash, contract: FACE_ADDRESS };
  } catch (error) {
    throw new Error(explain(error));
  }
}

export async function dropFace({ web3Auth, walletClient, address, tokenId }) {
  if (!address) throw new Error('No wallet');
  if (!walletClient) throw new Error('No wallet');
  if (!tokenId) throw new Error('No face');

  try {
    const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
    try {
      if (web3Auth?.switchChain) {
        await web3Auth.switchChain({ chainId: BASE_HEX });
      }
    } catch {
      /* already on Base */
    }

    const hash = await walletClient.writeContract({
      address: FACE_ADDRESS,
      abi: FACE_ABI,
      functionName: 'transferFrom',
      args: [address, DROP_TO, BigInt(tokenId)],
      account: address,
      chain: base,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('drop failed');
    return { tx: hash };
  } catch (error) {
    throw new Error(explain(error));
  }
}
