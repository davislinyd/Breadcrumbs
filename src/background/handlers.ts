import type { BgRequest, BgResultMap } from '../messaging/protocol';
import { appendAudit, uid } from './audit-service';
import { buildBackupPayload, importBackup } from './backup-service';
import { listCookies, removeCookie, setCookie } from './cookies-service';
import { AppFailure } from './errors';
import { nativeOptional } from './native';
import { loadAudit, loadCollections, loadDisabled, loadSettings, STORAGE, setStored } from './storage';
import { syncSnapshotNow } from './sync';
import { disableCookies, refreshDueRestores, restoreCookies } from './vault-service';

export async function handleRequest<T extends BgRequest>(message: T): Promise<BgResultMap[T['type']]> {
  switch (message.type) {
    case 'list':
      return listCookies(message.url) as Promise<BgResultMap[T['type']]>;
    case 'settings':
      return loadSettings() as Promise<BgResultMap[T['type']]>;
    case 'saveSettings':
      await setStored({ [STORAGE.settings]: { defaultView: message.settings.defaultView } });
      return true as BgResultMap[T['type']];
    case 'collections':
      return loadCollections() as Promise<BgResultMap[T['type']]>;
    case 'saveCollections':
      await setStored({ [STORAGE.collections]: message.collections });
      return true as BgResultMap[T['type']];
    case 'disabled':
      return loadDisabled() as Promise<BgResultMap[T['type']]>;
    case 'audit':
      return loadAudit() as Promise<BgResultMap[T['type']]>;
    case 'delete': {
      await removeCookie(message.cookie);
      await appendAudit({
        id: uid(),
        at: Date.now(),
        action: 'delete',
        key: message.cookie.key,
        summary: `已刪除 ${message.cookie.name}`,
      });
      return true as BgResultMap[T['type']];
    }
    case 'deleteMany': {
      for (const cookie of message.cookies) {
        await removeCookie(cookie);
        await appendAudit({
          id: uid(),
          at: Date.now(),
          action: 'delete-site',
          key: cookie.key,
          summary: `已從 ${message.site} 刪除 ${cookie.name}`,
        });
      }
      return { deleted: message.cookies.length } as BgResultMap[T['type']];
    }
    case 'disable':
      return disableCookies(message.cookies, message.dueAt) as Promise<BgResultMap[T['type']]>;
    case 'restore':
      return restoreCookies(message.ids, Boolean(message.force)) as Promise<BgResultMap[T['type']]>;
    case 'expiry': {
      await setCookie({ ...message.cookie, session: !message.expirationDate, expirationDate: message.expirationDate });
      await appendAudit({
        id: uid(),
        at: Date.now(),
        action: 'expiry',
        key: message.cookie.key,
        summary: `已更新 ${message.cookie.name} 到期時間`,
      });
      return true as BgResultMap[T['type']];
    }
    case 'backup':
      return buildBackupPayload() as Promise<BgResultMap[T['type']]>;
    case 'import':
      return importBackup(message.payload, { commit: message.commit, force: message.force }) as Promise<
        BgResultMap[T['type']]
      >;
    case 'nativeStatus': {
      const status = await nativeOptional<{ available?: boolean; updatedAt?: number }>({ action: 'status' });
      if (!status) return { available: false } as BgResultMap[T['type']];
      return {
        available: status.available ?? true,
        updatedAt: status.updatedAt,
      } as BgResultMap[T['type']];
    }
    case 'syncSnapshot': {
      const cookies = await listCookies();
      await syncSnapshotNow(cookies);
      return true as BgResultMap[T['type']];
    }
    default:
      throw new AppFailure('unsupported', 'Unsupported action');
  }
}

export { listCookies, refreshDueRestores };
