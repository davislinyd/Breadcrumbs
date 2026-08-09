import type { AuditEntry } from '../domain/types';
import { getStored, STORAGE, setStored } from './storage';

export const uid = () => crypto.randomUUID();

export async function appendAudit(entry: AuditEntry) {
  const audit = await getStored<AuditEntry[]>(STORAGE.audit, []);
  await setStored({ [STORAGE.audit]: [entry, ...audit].slice(0, 200) });
}
