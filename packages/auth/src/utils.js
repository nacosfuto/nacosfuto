export async function hashPassword(password) {
  if (!password) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function hashPasswordPBKDF2(password, salt = 'nacos_futo_salt_2026', iterations = 100000) {
  if (!password) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(salt),
          iterations: iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      const hashArray = Array.from(new Uint8Array(derivedBits));
      return `pbkdf2$${iterations}$` + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {}
  }
  return hashPassword(password);
}

export async function verifyPassword(password, storedHash, salt = 'nacos_futo_salt_2026') {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const iterations = parseInt(parts[1], 10) || 100000;
    const computed = await hashPasswordPBKDF2(password, salt, iterations);
    return computed === storedHash;
  }
  const unsalted = await hashPassword(password);
  let salted = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + salt));
    salted = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return storedHash === unsalted || (salted && storedHash === salted);
}


export function isLocalEnvironment() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    );
  }
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

