import type { BgRequest, BgResponse, BgResultMap } from './protocol';

export class MessagingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
  }
}

export async function sendMessage<T extends BgRequest['type']>(
  type: T,
  values: Omit<Extract<BgRequest, { type: T }>, 'type'> = {} as Omit<Extract<BgRequest, { type: T }>, 'type'>,
): Promise<BgResultMap[T]> {
  if (!globalThis.chrome?.runtime?.id || !globalThis.chrome.runtime.sendMessage) {
    throw new MessagingError('preview', 'preview');
  }
  const response = (await chrome.runtime.sendMessage({ type, ...values })) as BgResponse<BgResultMap[T]>;
  if (!response?.ok) {
    const error = response && 'error' in response ? response.error : { code: 'unknown', message: 'Unknown error' };
    throw new MessagingError(error.code, error.message);
  }
  return response.value;
}
