import { mkdir, writeFile } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { FACE_ABI, FACE_ADDRESS } from '../src/faceArtifact.js';

const RPC = 'https://mainnet.base.org';
const DIR = new URL('../public/nft/', import.meta.url);

function pngFromData(src) {
  if (!src || !src.startsWith('data:image/png;base64,')) return null;
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
  const image = await publicClient.readContract({
    address: FACE_ADDRESS,
    abi: FACE_ABI,
    functionName: 'imageData',
    args: [id],
  });
  const png = pngFromData(image);
  if (!png) continue;
  await writeFile(new URL(`${id}.png`, DIR), png);
  await writeFile(
    new URL(`${id}.json`, DIR),
    `${JSON.stringify({
      name: `FACE #${id}`,
      description: 'Metanoia face. Once.',
      image: `https://metanoia.fyi/nft/${id}.png`,
      external_url: 'https://metanoia.fyi',
    })}\n`,
  );
  console.log('wrote', String(id), png.length);
}
