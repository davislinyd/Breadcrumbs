import { argon2id } from 'hash-wasm';
import type { BackupEnvelope, BackupPayload } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array) {
  const key = await argon2id({ password, salt, iterations: 3, memorySize: 65_536, parallelism: 1, hashLength: 32, outputType: 'binary' });
  const material = new Uint8Array(key);
  return crypto.subtle.importKey('raw', material.buffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(payload: BackupPayload, password: string): Promise<BackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoder.encode(JSON.stringify(payload)));
  return {
    format: 'breadcrumbs', version: 1,
    kdf: { algorithm: 'argon2id', salt: bytesToBase64(salt), iterations: 3, memoryKiB: 65_536, parallelism: 1 },
    cipher: { algorithm: 'AES-256-GCM', nonce: bytesToBase64(nonce), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) },
  };
}

export async function decryptBackup(envelope: BackupEnvelope, password: string): Promise<BackupPayload> {
  if (envelope.format !== 'breadcrumbs' || envelope.version !== 1 || envelope.kdf.algorithm !== 'argon2id') throw new Error('Unsupported backup format');
  const key = await deriveKey(password, base64ToBytes(envelope.kdf.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.cipher.nonce) }, key, base64ToBytes(envelope.cipher.ciphertext));
  const payload = JSON.parse(decoder.decode(plain)) as BackupPayload;
  if (payload.version !== 1 || !Array.isArray(payload.cookies)) throw new Error('Invalid backup payload');
  return payload;
}
