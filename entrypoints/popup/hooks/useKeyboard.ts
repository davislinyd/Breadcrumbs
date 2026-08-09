import { type RefObject, useEffect } from 'react';

export function useKeyboard(options: { searchRef: RefObject<HTMLInputElement | null>; onEscape(): boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && options.onEscape()) {
        event.preventDefault();
        return;
      }
      const target = event.target as HTMLElement | null;
      const editing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !editing) {
        event.preventDefault();
        options.searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [options]);
}
