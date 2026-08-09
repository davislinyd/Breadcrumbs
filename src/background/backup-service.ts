import { mergeAudit, mergeCollections, mergeDisabledIndex, planImportCommit } from '../domain/import-merge';
import type { BackupPayload, ImportPreview, ImportResult } from '../domain/types';
import { listCookies, setCookie } from './cookies-service';
import { nativeMessage } from './native';
import { loadAudit, loadCollections, loadDisabled, STORAGE, setStored } from './storage';
import { vaultList } from './vault-service';

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [cookies, collections, disabledIndex, audit, vaultEntries] = await Promise.all([
    listCookies(),
    loadCollections(),
    loadDisabled(),
    loadAudit(),
    vaultList().catch(() => [] as Awaited<ReturnType<typeof vaultList>>),
  ]);
  const vaultById = new Map(vaultEntries.map((entry) => [entry.id, entry]));
  const disabled = disabledIndex.map((entry) => vaultById.get(entry.id) ?? entry);
  return { version: 1, exportedAt: Date.now(), cookies, collections, disabled, audit };
}

export async function importBackup(
  payload: BackupPayload,
  options: { commit: boolean; force?: boolean },
): Promise<ImportPreview | ImportResult> {
  const current = await listCookies();
  const plan = planImportCommit(payload, current, Boolean(options.force));
  const preview: ImportPreview = { eligible: plan.eligible.length, conflicts: plan.conflicts };
  if (!options.commit) return preview;

  for (const cookie of plan.cookiesToWrite) await setCookie(cookie);

  for (const entry of payload.disabled) {
    await nativeMessage({ action: 'vaultPut', id: entry.id, payload: entry });
  }

  const [collections, disabled, audit] = await Promise.all([loadCollections(), loadDisabled(), loadAudit()]);
  const nextCollections = mergeCollections(collections, payload.collections);
  const nextDisabled = mergeDisabledIndex(disabled, payload.disabled);
  const nextAudit = mergeAudit(audit, payload.audit);

  await setStored({
    [STORAGE.collections]: nextCollections,
    [STORAGE.disabled]: nextDisabled,
    [STORAGE.audit]: nextAudit,
  });

  return { ...preview, committed: true };
}
