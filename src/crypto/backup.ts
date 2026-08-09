import { argon2id } from 'hash-wasm';
import type { BackupEnvelope, BackupPayload } from '../domain/types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const MIN_BACKUP_PASSWORD_LENGTH = 8;
const BASE64_CHUNK = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    const slice = bytes.subarray(offset, offset + BASE64_CHUNK);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array) {
  const key = await argon2id({
    password,
    salt,
    iterations: 3,
    memorySize: 65_536,
    parallelism: 1,
    hashLength: 32,
    outputType: 'binary',
  });
  const material = Uint8Array.from(key);
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(payload: BackupPayload, password: string): Promise<BackupEnvelope> {
  if ([...password].length < MIN_BACKUP_PASSWORD_LENGTH) {
    throw new Error(`Backup password must be at least ${MIN_BACKUP_PASSWORD_LENGTH} characters`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoder.encode(JSON.stringify(payload))),
  );
  return {
    format: 'breadcrumbs',
    version: 1,
    kdf: { algorithm: 'argon2id', salt: bytesToBase64(salt), iterations: 3, memoryKiB: 65_536, parallelism: 1 },
    cipher: { algorithm: 'AES-256-GCM', nonce: bytesToBase64(nonce), ciphertext: bytesToBase64(ciphertext) },
  };
}

export async function decryptBackup(envelope: BackupEnvelope, password: string): Promise<BackupPayload> {
  if (envelope.format !== 'breadcrumbs' || envelope.version !== 1 || envelope.kdf.algorithm !== 'argon2id') {
    throw new Error('Unsupported backup format');
  }
  const key = await deriveKey(password, base64ToBytes(envelope.kdf.salt));
  const iv = Uint8Array.from(base64ToBytes(envelope.cipher.nonce));
  const data = Uint8Array.from(base64ToBytes(envelope.cipher.ciphertext));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const payload = JSON.parse(decoder.decode(plain)) as BackupPayload;
  if (payload.version !== 1 || !Array.isArray(payload.cookies)) throw new Error('Invalid backup payload');
  return payload;
}
