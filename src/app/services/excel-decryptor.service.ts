import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExcelDecryptorService {
  /**
   * Checks if an ArrayBuffer represents an encrypted Excel file.
   */
  isEncrypted(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 512) return false;

    // Check OLE2 header (D0 CF 11 E0 A1 B1 1A E1)
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      // Check for FILEPASS record (0x002F) or EncryptionInfo stream in OLE container
      return this.hasBiff8FilePass(bytes) || this.hasEncryptionInfo(bytes);
    }

    return false;
  }

  private hasBiff8FilePass(bytes: Uint8Array): boolean {
    // Quick search for FILEPASS record type (0x2F, 0x00)
    for (let i = 512; i < Math.min(bytes.length - 4, 8192); i++) {
      if (bytes[i] === 0x2f && bytes[i + 1] === 0x00) {
        const len = bytes[i + 2] | (bytes[i + 3] << 8);
        if (len >= 4 && len <= 1024) {
          return true;
        }
      }
    }
    return false;
  }

  private hasEncryptionInfo(bytes: Uint8Array): boolean {
    // Check for "EncryptionInfo" in UTF-16LE in directory
    const pattern = [
      0x45, 0x00, 0x6e, 0x00, 0x63, 0x00, 0x72, 0x00, 0x79, 0x00, 0x70, 0x00, 0x74, 0x00
    ];
    for (let i = 512; i < bytes.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (bytes[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  /**
   * Decrypts a password-protected BIFF8 (.xls) file with CryptoAPI.
   * Returns a decrypted ArrayBuffer that can be parsed normally.
   */
  decryptBiff8(oleBuffer: ArrayBuffer, password: string): ArrayBuffer {
    const oleBytes = new Uint8Array(oleBuffer.slice(0));

    const r16 = (u8: Uint8Array, off: number) => u8[off] | (u8[off + 1] << 8);
    const r32 = (u8: Uint8Array, off: number) =>
      (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
    const w32 = (u8: Uint8Array, off: number, val: number) => {
      u8[off] = val & 0xff;
      u8[off + 1] = (val >> 8) & 0xff;
      u8[off + 2] = (val >> 16) & 0xff;
      u8[off + 3] = (val >> 24) & 0xff;
    };

    const sectorSize = 1 << r16(oleBytes, 30);
    const firstDirSector = r32(oleBytes, 48);

    const fat: number[] = [];
    for (let i = 0; i < 109; i++) {
      const sec = r32(oleBytes, 76 + i * 4);
      if (sec === 0xfffffffe || sec === 0xffffffff) break;
      const offset = (sec + 1) * sectorSize;
      for (let j = 0; j < sectorSize; j += 4) {
        fat.push(r32(oleBytes, offset + j));
      }
    }

    const dirEntries: Uint8Array[] = [];
    let currSec = firstDirSector;
    while (currSec !== 0xfffffffe && currSec < fat.length) {
      const offset = (currSec + 1) * sectorSize;
      for (let j = 0; j < sectorSize; j += 128) {
        dirEntries.push(oleBytes.subarray(offset + j, offset + j + 128));
      }
      currSec = fat[currSec];
    }

    let wbEntryIdx = -1;
    let wbEntry: Uint8Array | null = null;
    for (let i = 0; i < dirEntries.length; i++) {
      const entry = dirEntries[i];
      const nameLen = r16(entry, 64);
      let name = '';
      for (let k = 0; k < nameLen - 2; k += 2) {
        name += String.fromCharCode(r16(entry, k));
      }
      if (name === 'Workbook' || name === 'Book') {
        wbEntryIdx = i;
        wbEntry = entry;
        break;
      }
    }

    if (!wbEntry) {
      throw new Error('لم يتم العثور على جدول البيانات داخل ملف الإكسل (Workbook not found)');
    }

    const startSec = r32(wbEntry, 116);
    const streamSize = r32(wbEntry, 120);

    const sectorsChain: number[] = [];
    currSec = startSec;
    const chunks: Uint8Array[] = [];
    while (currSec !== 0xfffffffe && currSec < fat.length) {
      sectorsChain.push(currSec);
      const offset = (currSec + 1) * sectorSize;
      chunks.push(oleBytes.subarray(offset, offset + sectorSize));
      currSec = fat[currSec];
    }

    const wbStream = new Uint8Array(streamSize);
    let wPos = 0;
    for (const ch of chunks) {
      const toCopy = Math.min(ch.length, streamSize - wPos);
      wbStream.set(ch.subarray(0, toCopy), wPos);
      wPos += toCopy;
      if (wPos >= streamSize) break;
    }

    let pos = 0;
    let filepassPos = -1;
    let filepassLen = -1;
    let salt: Uint8Array | null = null;
    let encVerifier: Uint8Array | null = null;
    let encVerifierHash: Uint8Array | null = null;

    while (pos < wbStream.length - 4) {
      const recType = r16(wbStream, pos);
      const recLen = r16(wbStream, pos + 2);
      if (recType === 0x002f) {
        filepassPos = pos;
        filepassLen = 4 + recLen;
        const fp = wbStream.subarray(pos + 4, pos + 4 + recLen);
        const encType = r16(fp, 0);
        if (encType === 0x0001) {
          const headerSize = r32(fp, 10);
          const saltSize = r32(fp, 14 + headerSize);
          const saltOffset = 14 + headerSize + 4;
          salt = fp.subarray(saltOffset, saltOffset + saltSize);
          encVerifier = fp.subarray(saltOffset + saltSize, saltOffset + saltSize + 16);
          const hashSize = r32(fp, saltOffset + saltSize + 16);
          encVerifierHash = fp.subarray(
            saltOffset + saltSize + 20,
            saltOffset + saltSize + 20 + hashSize
          );
        }
        break;
      }
      pos += 4 + recLen;
    }

    if (!salt || !encVerifier || !encVerifierHash) {
      throw new Error('تنسيق حماية وتشفير هذا الملف غير مدعوم');
    }

    // Derive Key from password (UTF-16LE)
    const pwdBytes = new Uint8Array(password.length * 2);
    for (let i = 0; i < password.length; i++) {
      const code = password.charCodeAt(i);
      pwdBytes[i * 2] = code & 0xff;
      pwdBytes[i * 2 + 1] = (code >> 8) & 0xff;
    }

    const saltAndPwd = new Uint8Array(salt.length + pwdBytes.length);
    saltAndPwd.set(salt, 0);
    saltAndPwd.set(pwdBytes, salt.length);
    const h0 = this.sha1(saltAndPwd);

    const getBlockKey = (blockNum: number) => {
      const b = new Uint8Array(4);
      w32(b, 0, blockNum);
      const hBlock = new Uint8Array(h0.length + 4);
      hBlock.set(h0, 0);
      hBlock.set(b, h0.length);
      return this.sha1(hBlock).subarray(0, 16);
    };

    // Verify password match
    const key0 = getBlockKey(0);
    const rc4Verify = new RC4Cipher(key0);
    const combined = new Uint8Array(encVerifier.length + encVerifierHash.length);
    combined.set(encVerifier, 0);
    combined.set(encVerifierHash, encVerifier.length);
    const decCombined = rc4Verify.process(combined);
    const decVerifier = decCombined.subarray(0, 16);
    const decVerifierHash = decCombined.subarray(16);
    const calcHash = this.sha1(decVerifier);

    let isMatch = true;
    if (decVerifierHash.length !== calcHash.length) {
      isMatch = false;
    } else {
      for (let i = 0; i < calcHash.length; i++) {
        if (decVerifierHash[i] !== calcHash[i]) {
          isMatch = false;
          break;
        }
      }
    }

    if (!isMatch) {
      throw new Error('INCORRECT_PASSWORD');
    }

    // Generate 1024-byte keystreams for all blocks
    const numBlocks = Math.ceil(wbStream.length / 1024);
    const keystreams: Uint8Array[] = [];
    for (let b = 0; b < numBlocks; b++) {
      const c = new RC4Cipher(getBlockKey(b));
      const ks = new Uint8Array(1024);
      for (let k = 0; k < 1024; k++) ks[k] = c.decryptByte(0);
      keystreams.push(ks);
    }

    // Decrypt BIFF8 record payloads
    const decStream = new Uint8Array(wbStream);
    pos = 0;
    let inEncryptedArea = false;

    while (pos < wbStream.length - 4) {
      const recType = r16(wbStream, pos);
      const recLen = r16(wbStream, pos + 2);
      const recPayloadPos = pos + 4;

      if (!inEncryptedArea) {
        if (recType === 0x002f) inEncryptedArea = true;
        pos += 4 + recLen;
        continue;
      }

      for (let k = 0; k < recLen; k++) {
        const bytePos = recPayloadPos + k;
        const block = Math.floor(bytePos / 1024);
        const offsetInBlock = bytePos % 1024;
        const ksByte = keystreams[block][offsetInBlock];

        if (recType === 0x0809) {
          // BOF payload in clear
        } else if (recType === 0x0085 && k < 4) {
          // BOUNDSHEET lbPlyPos in clear
        } else {
          decStream[bytePos] = wbStream[bytePos] ^ ksByte;
        }
      }

      pos += 4 + recLen;
    }

    // Remove FILEPASS and adjust BOUNDSHEET positions
    const cleanStream = new Uint8Array(decStream.length - filepassLen);
    cleanStream.set(decStream.subarray(0, filepassPos), 0);
    cleanStream.set(decStream.subarray(filepassPos + filepassLen), filepassPos);

    pos = 0;
    while (pos < cleanStream.length - 4) {
      const recType = r16(cleanStream, pos);
      const recLen = r16(cleanStream, pos + 2);
      if (recType === 0x0085) {
        const oldPos = r32(cleanStream, pos + 4);
        w32(cleanStream, pos + 4, oldPos - filepassLen);
      }
      pos += 4 + recLen;
    }

    // Update OLE Directory size
    const dirEntryOffset = (firstDirSector + 1) * sectorSize + wbEntryIdx * 128;
    w32(oleBytes, dirEntryOffset + 120, cleanStream.length);

    // Write back clean sectors
    let offsetInStream = 0;
    for (const sec of sectorsChain) {
      const secOffset = (sec + 1) * sectorSize;
      const chunk = cleanStream.subarray(offsetInStream, offsetInStream + sectorSize);
      oleBytes.fill(0, secOffset, secOffset + sectorSize);
      oleBytes.set(chunk, secOffset);
      offsetInStream += sectorSize;
      if (offsetInStream >= cleanStream.length) break;
    }

    return oleBytes.buffer;
  }

  /**
   * Pure TypeScript implementation of SHA-1 (FIPS 180-1 / RFC 3174).
   */
  private sha1(bytes: Uint8Array): Uint8Array {
    const rotl = (n: number, s: number) => (n << s) | (n >>> (32 - s));
    const len = bytes.length;
    const numBlocks = (((len + 8) >> 6) + 1) << 4;
    const words = new Uint32Array(numBlocks);
    for (let i = 0; i < len; i++) {
      words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[numBlocks - 1] = len * 8;

    let H0 = 0x67452301,
      H1 = 0xefcdab89,
      H2 = 0x98badcfe,
      H3 = 0x10325476,
      H4 = 0xc3d2e1f0;
    const W = new Uint32Array(80);

    for (let i = 0; i < numBlocks; i += 16) {
      for (let t = 0; t < 16; t++) W[t] = words[i + t];
      for (let t = 16; t < 80; t++) W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);

      let a = H0,
        b = H1,
        c = H2,
        d = H3,
        e = H4;
      for (let t = 0; t < 80; t++) {
        let f: number, k: number;
        if (t < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (t < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (t < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }

        const temp = (rotl(a, 5) + f + e + k + W[t]) >>> 0;
        e = d;
        d = c;
        c = rotl(b, 30) >>> 0;
        b = a;
        a = temp;
      }
      H0 = (H0 + a) >>> 0;
      H1 = (H1 + b) >>> 0;
      H2 = (H2 + c) >>> 0;
      H3 = (H3 + d) >>> 0;
      H4 = (H4 + e) >>> 0;
    }

    const out = new Uint8Array(20);
    const hArr = [H0, H1, H2, H3, H4];
    for (let i = 0; i < 5; i++) {
      out[i * 4] = (hArr[i] >> 24) & 0xff;
      out[i * 4 + 1] = (hArr[i] >> 16) & 0xff;
      out[i * 4 + 2] = (hArr[i] >> 8) & 0xff;
      out[i * 4 + 3] = hArr[i] & 0xff;
    }
    return out;
  }
}

class RC4Cipher {
  private S = new Uint8Array(256);
  private i = 0;
  private j = 0;

  constructor(key: Uint8Array) {
    for (let k = 0; k < 256; k++) this.S[k] = k;
    let j = 0;
    for (let k = 0; k < 256; k++) {
      j = (j + this.S[k] + key[k % key.length]) % 256;
      const tmp = this.S[k];
      this.S[k] = this.S[j];
      this.S[j] = tmp;
    }
  }

  decryptByte(b: number): number {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.S[this.i]) % 256;
    const tmp = this.S[this.i];
    this.S[this.i] = this.S[this.j];
    this.S[this.j] = tmp;
    const k = this.S[(this.S[this.i] + this.S[this.j]) % 256];
    return b ^ k;
  }

  process(data: Uint8Array): Uint8Array {
    const out = new Uint8Array(data.length);
    for (let idx = 0; idx < data.length; idx++) {
      out[idx] = this.decryptByte(data[idx]);
    }
    return out;
  }
}
