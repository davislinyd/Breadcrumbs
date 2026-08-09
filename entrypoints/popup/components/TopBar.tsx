import { CheckSquare, Menu, MoreVertical, RefreshCw, Square } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { t } from '../i18n/zh-Hant';

export function TopBar({
  menuOpen,
  onMenuToggle,
  onRefresh,
  onSelectAll,
  onClearSelection,
  onOpenAudit,
}: {
  menuOpen: boolean;
  onMenuToggle(): void;
  onRefresh(): void;
  onSelectAll(): void;
  onClearSelection(): void;
  onOpenAudit(): void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onMenuToggle();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen, onMenuToggle]);

  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="mark"
          src={chrome.runtime.getURL('icon/48.png')}
          width={26}
          height={26}
          alt=""
          draggable={false}
        />
        <h1>{t.appName}</h1>
      </div>
      <div className="header-actions" ref={menuRef}>
        <button className="icon-button" aria-label={t.moreActions} onClick={onMenuToggle}>
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="popover action-menu">
            <button
              onClick={() => {
                onMenuToggle();
                onRefresh();
              }}
            >
              <RefreshCw size={14} />
              {t.refresh}
            </button>
            <button
              onClick={() => {
                onSelectAll();
                onMenuToggle();
              }}
            >
              <CheckSquare size={14} />
              {t.selectVisible}
            </button>
            <button
              onClick={() => {
                onClearSelection();
                onMenuToggle();
              }}
            >
              <Square size={14} />
              {t.clearSelection}
            </button>
            <button onClick={onOpenAudit}>
              <Menu size={14} />
              {t.auditLog}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
