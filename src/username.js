const KEY = 'metanoia.profiles';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function addressKey(address) {
  return String(address).toLowerCase();
}

export function getProfile(address) {
  if (!address) return null;
  return readAll()[addressKey(address)] || null;
}

export function patchProfile(address, patch) {
  if (!address) return;
  const all = readAll();
  const key = addressKey(address);
  all[key] = { ...all[key], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getUsername(address) {
  const username = getProfile(address)?.username;
  return typeof username === 'string' && username ? username : null;
}

export function setUsername(address, username) {
  const prev = getProfile(address);
  patchProfile(address, {
    username,
    createdAt: prev?.createdAt || Date.now(),
  });
}

export function getAvatar(address) {
  const avatar = getProfile(address)?.avatar;
  return avatar && typeof avatar === 'object' ? avatar : null;
}

export function getTokenId(address) {
  const tokenId = getProfile(address)?.tokenId;
  return tokenId != null && String(tokenId) !== '' ? String(tokenId) : null;
}

export function parseUsername(value) {
  const username = String(value || '').trim();
  if (username.length < 3 || username.length > 24) {
    return { error: '3–24 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'letters, numbers, _' };
  }
  return { username };
}
