function toHex(bytes: Uint8Array) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

// Minimal MD5 implementation (Uint8Array -> hex).
// Based on the standard MD5 algorithm (RFC 1321).
function md5Hex(input: Uint8Array): string {
  const rotateLeft = (x: number, c: number) => (x << c) | (x >>> (32 - c));
  const add = (a: number, b: number) => (a + b) >>> 0;

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  }

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ] as const;

  const bitLen = input.length * 8;
  const withOne = new Uint8Array(input.length + 1);
  withOne.set(input);
  withOne[input.length] = 0x80;

  const padLen = (56 - (withOne.length % 64) + 64) % 64;
  const padded = new Uint8Array(withOne.length + padLen + 8);
  padded.set(withOne);

  // Append original length (little endian) as 64-bit.
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 2 ** 32) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const m = new Uint32Array(16);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) m[i] = view.getUint32(offset + i * 4, true);

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let f = 0;
      let g = 0;
      if (i < 16) {
        f = F(B, C, D);
        g = i;
      } else if (i < 32) {
        f = G(B, C, D);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = H(B, C, D);
        g = (3 * i + 5) % 16;
      } else {
        f = I(B, C, D);
        g = (7 * i) % 16;
      }

      const tmp = D;
      D = C;
      C = B;
      const sum = add(add(add(A, f), k[i]!), m[g]!);
      B = add(B, rotateLeft(sum, s[i]!));
      A = tmp;
    }

    a0 = add(a0, A);
    b0 = add(b0, B);
    c0 = add(c0, C);
    d0 = add(d0, D);
  }

  const digest = new Uint8Array(16);
  const outView = new DataView(digest.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return toHex(digest);
}

export function getGravatarUrl(email?: string | null, size = 40) {
  if (!email) return `https://0.gravatar.com/avatar/?d=mp&s=${size}`;
  const normalized = email.trim().toLowerCase();
  const hash = md5Hex(new TextEncoder().encode(normalized));
  return `https://0.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

