import { mkdir, writeFile } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from '../src/faceArtifact.js';

const RPC = 'https://mainnet.base.org';
const DIR = new URL('../public/nft/', import.meta.url);

function decodeUri(uri) {
  if (uri.startsWith('data:application/json;base64,')) {
    return Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString('utf8');
  }
  if (uri.startsWith('data:application/json,')) {
    return decodeURIComponent(uri.slice('data:application/json,'.length));
  }
  return uri;
}

function pngFromMeta(meta) {
  const src = meta.image_data || meta.image || '';
  if (!src.startsWith('data:image/png;base64,')) return null;
  return Buffer.from(src.slice('data:image/png;base64,'.length), 'base64');
}

const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
const code = await publicClient.getCode({ address: FACE_ADDRESS });
if (!code || code === '0x') {
  console.log('no contract');
  process.exit(0);
}

const nextId = await publicClient.readContract({
  address: FACE_ADDRESS,
  abi: FACE_ABI,
  functionName: 'nextId',
});

await mkdir(DIR, { recursive: true });

for (let id = 1n; id < nextId; id++) {
  const uri = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'tokenURI',
    args: [id],
  });
  let meta = {};
  try {
    meta = JSON.parse(decodeUri(uri));
  } catch {
    continue;
  }
  const png = pngFromMeta(meta);
  if (!png) continue;
  const file = new URL(`${id}.png`, DIR);
  await writeFile(file, png);
  console.log('wrote', file.pathname, png.length);
}
