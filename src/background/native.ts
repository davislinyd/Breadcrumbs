import { NATIVE_HOST } from '../messaging/protocol';
import { AppFailure } from './errors';

export async function nativeMessage<T extends Record<string, unknown>>(message: object): Promise<T> {
  const response = (await chrome.runtime.sendNativeMessage(NATIVE_HOST, message)) as T & {
    ok?: boolean;
    error?: string;
    code?: string;
  };
  if (response && response.ok === false) {
    throw new AppFailure(response.code ?? 'native', response.error ?? 'Native host error');
  }
  return response;
}

export async function nativeOptional<T extends Record<string, unknown>>(message: object): Promise<T | null> {
  try {
    return await nativeMessage<T>(message);
  } catch {
    return null;
  }
}
