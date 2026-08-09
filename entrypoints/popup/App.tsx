import { CloudDownload, CloudUpload, Copy, PauseCircle, RotateCcw, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { decryptBackup, encryptBackup, MIN_BACKUP_PASSWORD_LENGTH } from '../../src/crypto/backup';
import { setCookieText } from '../../src/domain/cookie-model';
import { groupCookies } from '../../src/domain/grouping';
import type {
  AppSettings,
  AuditEntry,
  BackupEnvelope,
  BackupPayload,
  CookieCollection,
  CookieRecord,
  DisabledCookie,
} from '../../src/domain/types';
import { sampleCookies } from '../../src/sample-data';
import { send } from './api';
import { AuditDrawer } from './components/AuditDrawer';
import { BulkBar } from './components/BulkBar';
import { DeleteConfirm } from './components/DeleteConfirm';
import { DomainGroup } from './components/DomainGroup';
import { Inspector } from './components/Inspector';
import { PromptForm } from './components/PromptForm';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { useKeyboard } from './hooks/useKeyboard';
import { t } from './i18n/zh-Hant';

type View = AppSettings['defaultView'];
type Dialog =
  | null
  | { kind: 'disable'; cookie: CookieRecord }
  | { kind: 'expiry'; cookie: CookieRecord }
  | { kind: 'collection'; cookie: CookieRecord }
  | { kind: 'rename-collection'; id: string; label: string }
  | { kind: 'backup-password' }
  | { kind: 'restore-password'; file: File }
  | { kind: 'delete-cookie'; cookie: CookieRecord }
  | { kind: 'delete-sites' }
  | { kind: 'import-confirm'; payload: BackupPayload; eligible: number; conflicts: number };

export function App() {
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [collections, setCollections] = useState<CookieCollection[]>([]);
  const [disabled, setDisabled] = useState<DisabledCookie[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ defaultView: 'Domain' });
  const [query, setQuery] = useState('');
  const [urlTarget, setUrlTarget] = useState('');
  const [expanded, setExpanded] = useState(new Set<string>());
  const [selectedSites, setSelectedSites] = useState<Map<string, CookieRecord[]>>(new Map());
  const [selected, setSelected] = useState<CookieRecord | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const view = settings.defaultView;
  const toast = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2800);
  };

  const reload = async (targetUrl = view === 'URL' ? urlTarget.trim() : '') => {
    try {
      if (targetUrl) new URL(targetUrl);
      const [live, savedCollections, savedDisabled] = await Promise.all([
        send('list', targetUrl ? { url: targetUrl } : {}),
        send('collections'),
        send('disabled'),
      ]);
      setCookies(live);
      setCollections(savedCollections);
      setDisabled(savedDisabled);
    } catch (error) {
      if (error instanceof TypeError) toast(t.invalidUrl);
      setCookies(sampleCookies);
      setExpanded(new Set(['google.com']));
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const saved = await send('settings');
        setSettings(saved);
        await reload(saved.defaultView === 'URL' ? urlTarget.trim() : '');
      } catch {
        await reload();
      }
    })();
  }, []);

  useEffect(() => {
    setRevealed(false);
  }, [selected?.key]);

  useEffect(() => {
    setSelectedSites(new Map());
    setSelected(null);
  }, [view, urlTarget]);

  useKeyboard({
    searchRef,
    onEscape: () => {
      if (dialog) {
        setDialog(null);
        return true;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (auditOpen) {
        setAuditOpen(false);
        return true;
      }
      if (selected) {
        setSelected(null);
        return true;
      }
      return false;
    },
  });

  const groups = useMemo(() => groupCookies(cookies, { view, query, urlTarget }), [cookies, query, view, urlTarget]);
  const selectedCookies = useMemo(
    () => [...new Map([...selectedSites.values()].flat().map((cookie) => [cookie.key, cookie])).values()],
    [selectedSites],
  );
  const selectedCount = selectedSites.size;
  const confirmationText = selectedCount === 1 ? [...selectedSites.keys()][0] : `DELETE ${selectedCount} SITES`;

  const persistSettings = async (next: AppSettings) => {
    const normalized = { defaultView: next.defaultView };
    setSettings(normalized);
    try {
      await send('saveSettings', { settings: normalized });
    } catch {
      /* preview */
    }
  };
  const setView = async (next: View) => {
    await persistSettings({ ...settings, defaultView: next });
    setExpanded(new Set());
  };
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast(t.copied);
  };
  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast(success);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : t.actionFailed);
    }
  };
  const toggleExpand = (id: string) =>
    setExpanded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSite = (label: string, items: CookieRecord[]) =>
    setSelectedSites((old) => {
      const next = new Map(old);
      if (next.has(label)) next.delete(label);
      else next.set(label, items);
      return next;
    });
  const selectAll = () => setSelectedSites(new Map(groups));
  const clearSelection = () => setSelectedSites(new Map());
  const openAudit = async () => {
    setMenuOpen(false);
    setAudit(await send('audit').catch(() => []));
    setAuditOpen(true);
  };
  const openSettings = async () => {
    setMenuOpen(false);
    setNativeAvailable((await send('nativeStatus').catch(() => ({ available: false }))).available ?? false);
    setSettingsOpen(true);
  };

  const saveCollections = async (next: CookieCollection[], success = t.collectionSaved) => {
    await act(() => send('saveCollections', { collections: next }), success);
  };

  const runDisable = (cookie: CookieRecord, minutes: string) => {
    const dueAt = minutes.trim() ? Date.now() + Number(minutes) * 60_000 : undefined;
    if (minutes.trim() && (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0)) {
      toast(t.positiveMinutes);
      return;
    }
    void act(async () => {
      const result = await send('disable', { cookies: [cookie], dueAt });
      if (result.failed.length) throw new Error(result.failed[0]?.error.message ?? t.actionFailed);
    }, t.cookieIsolated);
  };

  const runExpiry = (cookie: CookieRecord, value: string) => {
    const expirationDate = value ? Math.floor(new Date(value).getTime() / 1000) : undefined;
    if (value && !Number.isFinite(expirationDate)) {
      toast(t.invalidDate);
      return;
    }
    void act(() => send('expiry', { cookie, expirationDate }), t.expiryUpdated);
  };

  const runAddCollection = (cookie: CookieRecord, label: string) => {
    if (!label.trim()) return;
    const existing = collections.find((item) => item.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase());
    const next = existing
      ? collections.map((item) =>
          item.id === existing.id ? { ...item, keys: [...new Set([...item.keys, cookie.key])] } : item,
        )
      : [...collections, { id: crypto.randomUUID(), label: label.trim(), color: '#2563eb', keys: [cookie.key] }];
    void saveCollections(next);
  };

  const removeFromCollection = (collectionId: string, cookieKey: string) => {
    const next = collections
      .map((item) =>
        item.id === collectionId ? { ...item, keys: item.keys.filter((key) => key !== cookieKey) } : item,
      )
      .filter((item) => item.keys.length > 0);
    void saveCollections(next);
  };

  const renameCollection = (id: string, label: string) => {
    if (!label.trim()) return;
    void saveCollections(collections.map((item) => (item.id === id ? { ...item, label: label.trim() } : item)));
  };

  const deleteCollection = (id: string) => {
    void saveCollections(collections.filter((item) => item.id !== id));
  };

  const exportBackup = async (password: string) => {
    if ([...password].length < MIN_BACKUP_PASSWORD_LENGTH) {
      toast(t.passwordMin(MIN_BACKUP_PASSWORD_LENGTH));
      return;
    }
    try {
      const encrypted = await encryptBackup(await send('backup'), password);
      const url = URL.createObjectURL(new Blob([JSON.stringify(encrypted)], { type: 'application/json' }));
      await chrome.downloads.download({
        url,
        filename: `breadcrumbs-${new Date().toISOString().slice(0, 10)}.breadcrumbs`,
        saveAs: true,
      });
      URL.revokeObjectURL(url);
      toast(t.backupCreated);
    } catch (error) {
      toast(error instanceof Error ? error.message : t.backupFailed);
    }
  };

  const importBackup = async (file: File, password: string) => {
    try {
      const payload = await decryptBackup(JSON.parse(await file.text()) as BackupEnvelope, password);
      const preview = await send('import', { payload, commit: false });
      if (preview.conflicts.length) {
        setDialog({
          kind: 'import-confirm',
          payload,
          eligible: preview.eligible,
          conflicts: preview.conflicts.length,
        });
        return;
      }
      await send('import', { payload, commit: true, force: false });
      toast(t.backupRestored);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : t.backupReadFailed);
    }
  };

  const deleteSelected = async () => {
    await act(
      () =>
        send('deleteMany', {
          cookies: selectedCookies,
          site: selectedCount === 1 ? confirmationText : `${selectedCount} selected sites`,
        }),
      t.cookiesDeleted(selectedCookies.length),
    );
    clearSelection();
    setSelected(null);
    setDialog(null);
  };

  return (
    <main className="app">
      <TopBar
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        onRefresh={() => void reload()}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onOpenAudit={() => void openAudit()}
      />
      <Toolbar
        count={cookies.length}
        query={query}
        onQuery={setQuery}
        view={view}
        onView={(next) => void setView(next)}
        urlTarget={urlTarget}
        onUrlTarget={setUrlTarget}
        onUrlCommit={() => void reload()}
        searchRef={searchRef}
      />
      {selectedCount > 0 && (
        <BulkBar
          siteCount={selectedCount}
          cookieCount={selectedCookies.length}
          onClear={clearSelection}
          onDelete={() => setDialog({ kind: 'delete-sites' })}
        />
      )}
      <div className="main-pane">
        <section className="cookie-list" aria-label="Cookie list">
          {disabled.length > 0 && (
            <div className="paused-row">
              <PauseCircle size={16} />
              <span>{t.paused(disabled.length)}</span>
              <button
                onClick={() => void act(() => send('restore', { ids: disabled.map((item) => item.id) }), t.restored)}
              >
                <RotateCcw size={14} />
                {t.restoreAvailable}
              </button>
            </div>
          )}
          {groups.map(([domain, items]) => (
            <DomainGroup
              key={domain}
              domain={domain}
              items={items}
              expanded={expanded.has(domain)}
              checked={selectedSites.has(domain)}
              selected={selected?.key}
              onToggle={() => toggleExpand(domain)}
              onCheck={() => toggleSite(domain, items)}
              onSelect={setSelected}
              onCopy={copy}
              onDisable={(cookie) => setDialog({ kind: 'disable', cookie })}
              onDelete={(cookie) => setDialog({ kind: 'delete-cookie', cookie })}
            />
          ))}
          {!groups.length && <div className="empty">{t.empty}</div>}
        </section>
        {selected && (
          <Inspector
            cookie={selected}
            revealed={revealed}
            collections={collections.filter((group) => group.keys.includes(selected.key))}
            onReveal={() => setRevealed((value) => !value)}
            onCopy={copy}
            onClose={() => setSelected(null)}
            onExpiry={() => setDialog({ kind: 'expiry', cookie: selected })}
            onAddCollection={() => setDialog({ kind: 'collection', cookie: selected })}
            onRemoveFromCollection={(id) => removeFromCollection(id, selected.key)}
          />
        )}
      </div>
      <footer className="footer">
        <button onClick={() => setDialog({ kind: 'backup-password' })}>
          <CloudUpload size={16} />
          {t.backup}
        </button>
        <button onClick={() => inputRef.current?.click()}>
          <CloudDownload size={16} />
          {t.restore}
        </button>
        <button onClick={() => (selected ? void copy(setCookieText(selected)) : toast(t.selectCookieFirst))}>
          <Copy size={16} />
          {t.copyRaw}
        </button>
        <button className="settings" aria-label={t.settings} onClick={() => void openSettings()}>
          <Settings size={17} />
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".breadcrumbs,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) setDialog({ kind: 'restore-password', file });
          }}
        />
      </footer>
      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          nativeAvailable={nativeAvailable}
          collections={collections}
          onView={(next) => void setView(next)}
          onSync={() =>
            void act(async () => {
              await send('syncSnapshot');
            }, t.synced)
          }
          onRenameCollection={(id) => {
            const item = collections.find((entry) => entry.id === id);
            if (item) setDialog({ kind: 'rename-collection', id, label: item.label });
          }}
          onDeleteCollection={deleteCollection}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {auditOpen && <AuditDrawer entries={audit} onClose={() => setAuditOpen(false)} />}

      {dialog?.kind === 'disable' && (
        <PromptForm
          title={t.disableTitle}
          field={{ kind: 'number', label: t.disableHint, defaultValue: '30', placeholder: '30' }}
          submitLabel={t.disableSubmit}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            setDialog(null);
            runDisable(dialog.cookie, value);
          }}
        />
      )}
      {dialog?.kind === 'expiry' && (
        <PromptForm
          title={t.expiryTitle}
          field={{
            kind: 'datetime',
            label: t.expiryHint,
            defaultValue: dialog.cookie.expirationDate
              ? new Date(dialog.cookie.expirationDate * 1000).toISOString().slice(0, 16)
              : '',
          }}
          submitLabel={t.expirySubmit}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            setDialog(null);
            runExpiry(dialog.cookie, value);
          }}
        />
      )}
      {dialog?.kind === 'collection' && (
        <PromptForm
          title={t.collectionTitle}
          field={{ kind: 'text', label: t.collectionHint }}
          submitLabel={t.collectionSubmit}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            setDialog(null);
            runAddCollection(dialog.cookie, value);
          }}
        />
      )}
      {dialog?.kind === 'rename-collection' && (
        <PromptForm
          title={t.rename}
          field={{ kind: 'text', label: t.collectionHint, defaultValue: dialog.label }}
          submitLabel={t.collectionSubmit}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            setDialog(null);
            renameCollection(dialog.id, value);
          }}
        />
      )}
      {dialog?.kind === 'backup-password' && (
        <PromptForm
          title={t.backupPasswordTitle}
          field={{ kind: 'password', label: t.passwordLabel, minLength: MIN_BACKUP_PASSWORD_LENGTH }}
          submitLabel={t.passwordSubmitBackup}
          onClose={() => setDialog(null)}
          validate={(value) =>
            [...value].length < MIN_BACKUP_PASSWORD_LENGTH ? t.passwordMin(MIN_BACKUP_PASSWORD_LENGTH) : null
          }
          onSubmit={(value) => {
            setDialog(null);
            void exportBackup(value);
          }}
        />
      )}
      {dialog?.kind === 'restore-password' && (
        <PromptForm
          title={t.restorePasswordTitle}
          field={{ kind: 'password', label: t.passwordLabel }}
          submitLabel={t.passwordSubmitRestore}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            const file = dialog.file;
            setDialog(null);
            void importBackup(file, value);
          }}
        />
      )}
      {dialog?.kind === 'delete-cookie' && (
        <DeleteConfirm
          title={t.deleteCookieTitle}
          body={t.deleteCookieBody(dialog.cookie.name)}
          expected={dialog.cookie.name}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const cookie = dialog.cookie;
            setDialog(null);
            void act(() => send('delete', { cookie }), t.cookieDeleted);
          }}
        />
      )}
      {dialog?.kind === 'delete-sites' && (
        <DeleteConfirm
          title={t.deleteSitesTitle}
          body={t.deleteSitesBody(selectedCookies.length, [...selectedSites.keys()].join(', '))}
          expected={confirmationText}
          onClose={() => setDialog(null)}
          onConfirm={() => void deleteSelected()}
        />
      )}
      {dialog?.kind === 'import-confirm' && (
        <DeleteConfirm
          title={t.restore}
          body={t.importConflicts(dialog.eligible, dialog.conflicts)}
          expected="RESTORE"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const payload = dialog.payload;
            setDialog(null);
            void act(() => send('import', { payload, commit: true, force: false }), t.backupRestored);
          }}
        />
      )}
      {message && <div className="toast">{message}</div>}
    </main>
  );
}
