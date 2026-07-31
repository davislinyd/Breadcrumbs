import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare, ChevronDown, ChevronRight, Clipboard, CloudDownload, CloudUpload, Copy, Eye, EyeOff, Filter,
  Globe2, KeyRound, Menu, MoreVertical, PauseCircle, Plus, RefreshCw, RotateCcw, Search, Settings,
  Square, Trash2, X,
} from 'lucide-react';
import { decryptBackup, encryptBackup } from '../../src/crypto';
import { sampleCookies } from '../../src/sample-data';
import type { AppSettings, AuditEntry, BackupEnvelope, BackupPayload, CookieCollection, CookieRecord, DisabledCookie } from '../../src/types';
import { rawCookie, setCookieText } from '../../src/types';

type View = AppSettings['defaultView'];
type StoreOption = { id: string; label: string; tabCount: number };
type Response<T> = { ok: true; value: T } | { ok: false; error: string };

async function send<T>(type: string, values: Record<string, unknown> = {}): Promise<T> {
  if (!globalThis.chrome?.runtime?.id || !globalThis.chrome.runtime.sendMessage) throw new Error('preview');
  const response = await chrome.runtime.sendMessage({ type, ...values }) as Response<T>;
  if (!response.ok) throw new Error(response.error);
  return response.value;
}

const fmtExpiry = (cookie: CookieRecord) => cookie.session ? 'Session' : cookie.expirationDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(cookie.expirationDate * 1000) : 'Session';
const masked = (value: string) => '•'.repeat(Math.min(Math.max(value.length, 12), 24));
const groupDomain = (domain: string) => domain.replace(/^\./, '').split('.').slice(-2).join('.');

/** Main interface rendered inside the Breadcrumbs toolbar popup. */
export function App() {
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [collections, setCollections] = useState<CookieCollection[]>([]);
  const [disabled, setDisabled] = useState<DisabledCookie[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([{ id: '0', label: 'Default store', tabCount: 0 }]);
  const [settings, setSettings] = useState<AppSettings>({ defaultView: 'Domain' });
  const [query, setQuery] = useState('');
  const [urlTarget, setUrlTarget] = useState('');
  const [expanded, setExpanded] = useState(new Set<string>());
  const [selectedSites, setSelectedSites] = useState<Map<string, CookieRecord[]>>(new Map());
  const [selected, setSelected] = useState<CookieRecord | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeStore = settings.activeStoreId;
  const view = settings.defaultView;
  const toast = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 2800); };

  const reload = async (storeId = activeStore, targetUrl = view === 'URL' ? urlTarget.trim() : '') => {
    try {
      if (targetUrl) new URL(targetUrl);
      const [live, savedCollections, savedDisabled] = await Promise.all([
        send<CookieRecord[]>('list', { storeId, ...(targetUrl ? { url: targetUrl } : {}) }),
        send<CookieCollection[]>('collections'), send<DisabledCookie[]>('disabled'),
      ]);
      setCookies(live); setCollections(savedCollections); setDisabled(savedDisabled);
    } catch (error) {
      if (error instanceof TypeError) toast('請輸入有效的完整 URL');
      setCookies(sampleCookies.filter(cookie => !storeId || cookie.storeId === storeId));
      setExpanded(new Set(['google.com']));
    }
  };

  useEffect(() => { void (async () => {
    try {
      const [saved, availableStores] = await Promise.all([send<AppSettings>('settings'), send<StoreOption[]>('stores')]);
      setSettings(saved); setStores(availableStores); await reload(saved.activeStoreId, saved.defaultView === 'URL' ? urlTarget.trim() : '');
    } catch { await reload(); }
  })(); }, []);
  useEffect(() => { setRevealed(false); }, [selected?.key]);
  useEffect(() => { setSelectedSites(new Map()); setSelected(null); }, [activeStore, view, urlTarget]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (auditOpen) {
          event.preventDefault();
          setAuditOpen(false);
          return;
        }
        if (selected) {
          event.preventDefault();
          setSelected(null);
          return;
        }
      }
      const target = event.target as HTMLElement | null;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !editing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selected, settingsOpen, auditOpen]);

  const groups = useMemo(() => {
    const target = query.trim().toLowerCase();
    const map = new Map<string, CookieRecord[]>();
    let targetHost = '';
    if (view === 'URL' && urlTarget) {
      try { targetHost = new URL(urlTarget).host; } catch { targetHost = urlTarget; }
    }
    for (const cookie of cookies.filter(item => !target || [item.name, item.domain, item.path].some(value => value.toLowerCase().includes(target)))) {
      const label = view === 'FQDN' ? cookie.domain.replace(/^\./, '') : view === 'URL' ? (targetHost || `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`) : groupDomain(cookie.domain);
      map.set(label, [...(map.get(label) ?? []), cookie]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cookies, query, view, urlTarget]);
  const selectedCookies = useMemo(() => [...new Map([...selectedSites.values()].flat().map(cookie => [cookie.key, cookie])).values()], [selectedSites]);
  const selectedCount = selectedSites.size;
  const confirmationText = selectedCount === 1 ? [...selectedSites.keys()][0] : `DELETE ${selectedCount} SITES`;

  const persistSettings = async (next: AppSettings) => { setSettings(next); try { await send('saveSettings', { settings: next }); } catch { /* preview */ } };
  const setStore = async (storeId: string) => { await persistSettings({ ...settings, activeStoreId: storeId }); setProfileOpen(false); await reload(storeId); };
  const setView = async (next: View) => { await persistSettings({ ...settings, defaultView: next }); setExpanded(new Set()); };
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); };
  const act = async (fn: () => Promise<unknown>, success: string) => { try { await fn(); toast(success); await reload(); } catch (error) { toast(error instanceof Error ? error.message : 'Action failed'); } };
  const toggleExpand = (id: string) => setExpanded(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSite = (label: string, items: CookieRecord[]) => setSelectedSites(old => { const next = new Map(old); next.has(label) ? next.delete(label) : next.set(label, items); return next; });
  const selectAll = () => setSelectedSites(new Map(groups));
  const clearSelection = () => setSelectedSites(new Map());
  const openAudit = async () => { setMenuOpen(false); setAudit(await send<AuditEntry[]>('audit').catch(() => [])); setAuditOpen(true); };
  const openSettings = async () => { setMenuOpen(false); setNativeAvailable((await send<{ available?: boolean }>('nativeStatus').catch(() => ({ available: false }))).available ?? false); setSettingsOpen(true); };

  const disable = (cookie: CookieRecord) => {
    const minutes = window.prompt('暫時停用幾分鐘？留空表示手動還原。', '30');
    if (minutes === null) return;
    const dueAt = minutes.trim() ? Date.now() + Number(minutes) * 60_000 : undefined;
    if (minutes.trim() && (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0)) return toast('請輸入正整數分鐘');
    void act(() => send('disable', { cookies: [cookie], dueAt }), 'Cookie 已隔離');
  };
  const editExpiry = (cookie: CookieRecord) => {
    const value = window.prompt('到期時間（ISO 8601；留空改為 session cookie）', cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString().slice(0, 16) : '');
    if (value === null) return;
    const expirationDate = value ? Math.floor(new Date(value).getTime() / 1000) : undefined;
    if (value && !Number.isFinite(expirationDate)) return toast('無效的日期');
    void act(() => send('expiry', { cookie, expirationDate }), '到期時間已更新');
  };
  const addCollection = () => {
    if (!selected) return;
    const label = window.prompt('帳號／集合名稱');
    if (!label?.trim()) return;
    const existing = collections.find(item => item.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase());
    const next = existing ? collections.map(item => item.id === existing.id ? { ...item, keys: [...new Set([...item.keys, selected.key])] } : item) : [...collections, { id: crypto.randomUUID(), label: label.trim(), color: '#2563eb', keys: [selected.key] }];
    void act(() => send('saveCollections', { collections: next }), '已加入集合');
  };
  const exportBackup = async () => {
    const password = window.prompt('設定備份密碼（至少 12 字元）');
    if (!password || password.length < 12) return toast('備份密碼至少需 12 字元');
    try {
      const encrypted = await encryptBackup(await send<BackupPayload>('backup'), password);
      const url = URL.createObjectURL(new Blob([JSON.stringify(encrypted)], { type: 'application/json' }));
      await chrome.downloads.download({ url, filename: `breadcrumbs-${new Date().toISOString().slice(0, 10)}.breadcrumbs`, saveAs: true }); URL.revokeObjectURL(url); toast('已建立加密備份');
    } catch (error) { toast(error instanceof Error ? error.message : 'Backup failed'); }
  };
  const importBackup = async (file: File) => {
    const password = window.prompt('輸入備份密碼'); if (!password) return;
    try {
      const payload = await decryptBackup(JSON.parse(await file.text()) as BackupEnvelope, password);
      const preview = await send<{ eligible: number; conflicts: string[] }>('import', { payload, commit: false });
      const proceed = !preview.conflicts.length || window.confirm(`${preview.eligible} 項可還原，${preview.conflicts.length} 項衝突。確定可還原項目？`);
      if (proceed) await send('import', { payload, commit: true, force: false });
      toast('備份已還原；衝突項目保留現有值'); await reload();
    } catch (error) { toast(error instanceof Error ? error.message : '無法讀取備份'); }
  };
  const deleteSelected = async () => {
    await act(() => send('deleteMany', { cookies: selectedCookies, site: selectedCount === 1 ? confirmationText : `${selectedCount} selected sites` }), `已刪除 ${selectedCookies.length} 個 cookie`);
    clearSelection(); setSelected(null); setConfirmOpen(false);
  };

  const activeStoreLabel = stores.find(store => store.id === activeStore)?.label ?? 'All stores';
  return <main className="app">
    <header className="topbar"><div className="brand"><span className="mark"><i /><i /><i /><i /></span><h1>Breadcrumbs</h1></div><div className="header-actions"><button className="profile" onClick={() => { setProfileOpen(!profileOpen); setMenuOpen(false); }}><KeyRound size={17} /> {activeStoreLabel}<ChevronDown size={17} /></button><button className="icon-button" aria-label="More actions" onClick={() => { setMenuOpen(!menuOpen); setProfileOpen(false); }}><MoreVertical size={19} /></button></div>{profileOpen && <div className="popover profile-menu">{stores.map(store => <button key={store.id} className={store.id === activeStore ? 'active' : ''} onClick={() => void setStore(store.id)}><KeyRound size={15} /><span>{store.label}</span><small>{store.tabCount} tabs</small></button>)}</div>}{menuOpen && <div className="popover action-menu"><button onClick={() => { setMenuOpen(false); void reload(); }}><RefreshCw size={16} />Refresh cookies</button><button onClick={() => { selectAll(); setMenuOpen(false); }}><CheckSquare size={16} />Select visible sites</button><button onClick={() => { clearSelection(); setMenuOpen(false); }}><Square size={16} />Clear selection</button><button onClick={() => void openAudit()}><Menu size={16} />Audit log</button></div>}</header>
    <section className="toolbar"><div className="total"><Globe2 size={22} /><strong>All cookies</strong><span>{cookies.length}</span></div><label className="search"><Search size={20} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search cookies" /><kbd>/</kbd></label><label className="view-select"><Filter size={18} /><select value={view} onChange={event => void setView(event.target.value as View)}><option>Domain</option><option>FQDN</option><option>URL</option></select></label>{view === 'URL' && <label className="url-target"><Globe2 size={17} /><input value={urlTarget} onChange={event => setUrlTarget(event.target.value)} onBlur={() => void reload()} placeholder="https://example.com/path" /></label>}</section>
    {selectedCount > 0 && <section className="bulkbar"><strong>{selectedCount} site{selectedCount > 1 ? 's' : ''} · {selectedCookies.length} cookies selected</strong><button onClick={clearSelection}>Clear</button><button className="delete-selected" onClick={() => setConfirmOpen(true)}><Trash2 size={16} />Delete selected</button></section>}
    <section className="cookie-list" aria-label="Cookie list">
      {disabled.length > 0 && <div className="paused-row"><PauseCircle size={18} /><span>{disabled.length} temporarily disabled</span><button onClick={() => void act(() => send('restore', { ids: disabled.map(item => item.id) }), '已還原可安全復原的 cookie')}><RotateCcw size={16} />Restore available</button></div>}
      {groups.map(([domain, items]) => <DomainGroup key={domain} domain={domain} items={items} expanded={expanded.has(domain)} checked={selectedSites.has(domain)} onToggle={() => toggleExpand(domain)} onCheck={() => toggleSite(domain, items)} selected={selected?.key} onSelect={setSelected} onCopy={copy} onDisable={disable} onDelete={cookie => void act(() => send('delete', { cookie }), 'Cookie 已刪除')} />)}
      {!groups.length && <div className="empty">沒有符合的 cookie</div>}
    </section>
    {selected && <Inspector cookie={selected} revealed={revealed} collections={collections.filter(group => group.keys.includes(selected.key))} onReveal={() => setRevealed(value => !value)} onCopy={copy} onClose={() => setSelected(null)} onExpiry={() => editExpiry(selected)} onAddCollection={addCollection} />}
    <footer className="footer"><button onClick={() => void exportBackup()}><CloudUpload size={18} />Backup</button><button onClick={() => inputRef.current?.click()}><CloudDownload size={18} />Restore</button><button onClick={() => selected ? void copy(setCookieText(selected)) : toast('請先選取 cookie')}><Copy size={18} />Copy raw</button><button className="settings" aria-label="Settings" onClick={() => void openSettings()}><Settings size={19} /></button><input ref={inputRef} hidden type="file" accept=".breadcrumbs,application/json" onChange={event => event.target.files?.[0] && void importBackup(event.target.files[0])} /></footer>
    {settingsOpen && <SettingsDrawer settings={settings} storeLabel={activeStoreLabel} nativeAvailable={nativeAvailable} onView={setView} onClose={() => setSettingsOpen(false)} />}
    {auditOpen && <AuditDrawer entries={audit} onClose={() => setAuditOpen(false)} />}
    {confirmOpen && <DeleteConfirm sites={[...selectedSites.keys()]} cookieCount={selectedCookies.length} expected={confirmationText} onClose={() => setConfirmOpen(false)} onConfirm={() => void deleteSelected()} />}
    {message && <div className="toast">{message}</div>}
  </main>;
}

function DomainGroup({ domain, items, expanded, checked, onToggle, onCheck, selected, onSelect, onCopy, onDisable, onDelete }: { domain: string; items: CookieRecord[]; expanded: boolean; checked: boolean; onToggle(): void; onCheck(): void; selected?: string; onSelect(cookie: CookieRecord): void; onCopy(value: string): void; onDisable(cookie: CookieRecord): void; onDelete(cookie: CookieRecord): void }) {
  return <div className="domain-group"><div className="domain-row"><button className="check" aria-label={`Select ${domain}`} onClick={onCheck}>{checked ? <CheckSquare size={19} /> : <Square size={19} />}</button><button className="domain-toggle" onClick={onToggle}>{expanded ? <ChevronDown size={19} /> : <ChevronRight size={19} />}<Globe2 size={21} /><strong>{domain}</strong><span>{items.length}</span></button></div>{expanded && <div className="rows"><div className="column-head"><span>Cookie name / FQDN</span><span>Scope</span><span>Path</span><span>Flags</span><span>Expiry</span><span>Actions</span></div>{items.map(cookie => <div className={`cookie-row ${selected === cookie.key ? 'selected' : ''}`} key={cookie.key} onClick={() => onSelect(cookie)}><strong><span>{cookie.name}</span><small className="cookie-fqdn">{cookie.domain.replace(/^\./, '')}{!cookie.hostOnly && ' · all subdomains'}</small></strong><span className={cookie.hostOnly ? 'scope host' : 'scope'}>{cookie.hostOnly ? 'Host-only' : 'Domain'}</span><span>{cookie.path}</span><span className="flags">{cookie.secure && 'Secure'}{cookie.httpOnly && 'HttpOnly'}</span><span className={cookie.session ? 'expiry session' : 'expiry'}><i />{fmtExpiry(cookie)}</span><span className="actions"><button title="Reveal" onClick={event => { event.stopPropagation(); onSelect(cookie); }}><Eye size={17} /></button><button title="Copy" onClick={event => { event.stopPropagation(); void onCopy(rawCookie(cookie)); }}><Clipboard size={17} /></button><button title="Temporarily disable" onClick={event => { event.stopPropagation(); onDisable(cookie); }}><PauseCircle size={17} /></button><button title="Delete" className="danger" onClick={event => { event.stopPropagation(); if (window.confirm(`刪除 ${cookie.name}？`)) onDelete(cookie); }}><Trash2 size={17} /></button></span></div>)}</div>}</div>;
}

function Inspector({ cookie, revealed, collections, onReveal, onCopy, onClose, onExpiry, onAddCollection }: { cookie: CookieRecord; revealed: boolean; collections: CookieCollection[]; onReveal(): void; onCopy(value: string): void; onClose(): void; onExpiry(): void; onAddCollection(): void }) {
  return <aside className="inspector"><div className="inspector-head"><strong>Inspector: {cookie.name}</strong><button onClick={onClose}><X size={19} /></button></div><div className="inspector-body"><div className="raw"><label>Set-Cookie (reconstructed)</label><code>{revealed ? setCookieText(cookie) : `${cookie.name}=${masked(cookie.value)}; Path=${cookie.path}; Domain=${cookie.domain}`}</code><button className="reveal" onClick={onReveal}>{revealed ? <EyeOff size={17} /> : <Eye size={17} />}{revealed ? 'Hide value' : 'Reveal full value'}</button></div><dl><dt>Name</dt><dd>{cookie.name}</dd><dt>Value</dt><dd>{revealed ? cookie.value : masked(cookie.value)}</dd><dt>Domain</dt><dd>{cookie.domain} {cookie.hostOnly && '(host-only)'}</dd><dt>Path</dt><dd>{cookie.path}</dd><dt>Expires</dt><dd>{fmtExpiry(cookie)} <button className="text-button" onClick={onExpiry}>Edit</button></dd><dt>Secure</dt><dd>{cookie.secure ? 'Yes' : 'No'}</dd><dt>HttpOnly</dt><dd>{cookie.httpOnly ? 'Yes' : 'No'}</dd><dt>SameSite</dt><dd>{cookie.sameSite}</dd><dt>Collections</dt><dd>{collections.map(item => item.label).join(', ') || <button className="text-button" onClick={onAddCollection}><Plus size={14} /> Add</button>}</dd></dl></div><div className="inspector-actions"><button onClick={() => void onCopy(rawCookie(cookie))}><Copy size={16} />Copy name=value</button><button onClick={() => void onCopy(setCookieText(cookie))}><Clipboard size={16} />Copy Set-Cookie</button></div></aside>;
}

function SettingsDrawer({ settings, storeLabel, nativeAvailable, onView, onClose }: { settings: AppSettings; storeLabel: string; nativeAvailable: boolean | null; onView(view: View): void; onClose(): void }) {
  return <aside className="drawer"><div className="drawer-head"><strong>Settings</strong><button onClick={onClose}><X size={19} /></button></div><section><label>Default view<select value={settings.defaultView} onChange={event => void onView(event.target.value as View)}><option>Domain</option><option>FQDN</option><option>URL</option></select></label><p><b>Cookie store</b><span>{storeLabel}</span></p><p><b>Host access</b><span>All websites enabled</span></p><p><b>Native companion</b><span className={nativeAvailable ? 'good' : 'warning'}>{nativeAvailable ? 'Connected' : 'Not installed'}</span></p></section></aside>;
}

function AuditDrawer({ entries, onClose }: { entries: AuditEntry[]; onClose(): void }) {
  return <aside className="drawer audit-drawer"><div className="drawer-head"><strong>Audit log</strong><button onClick={onClose}><X size={19} /></button></div><section className="audit-list">{entries.length ? entries.map(entry => <div key={entry.id}><strong>{entry.summary}</strong><span>{new Date(entry.at).toLocaleString()}</span></div>) : <p>No Breadcrumbs changes yet.</p>}</section></aside>;
}

function DeleteConfirm({ sites, cookieCount, expected, onClose, onConfirm }: { sites: string[]; cookieCount: number; expected: string; onClose(): void; onConfirm(): void }) {
  const [value, setValue] = useState('');
  return <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-label="Confirm site deletion"><div><Trash2 size={23} /><h2>Delete site cookies?</h2></div><p>This permanently removes <b>{cookieCount}</b> cookies from <b>{sites.join(', ')}</b>. Create a backup first if you need recovery.</p><label>Type <code>{expected}</code> to confirm<input autoFocus value={value} onChange={event => setValue(event.target.value)} /></label><footer><button onClick={onClose}>Cancel</button><button className="danger-button" disabled={value !== expected} onClick={onConfirm}>Delete cookies</button></footer></section></div>;
}
