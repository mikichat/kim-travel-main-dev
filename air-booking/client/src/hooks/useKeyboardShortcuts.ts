// @TASK P2-T1 - 키보드 단축키 시스템 훅
import { useEffect, useRef } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;
type ShortcutMap = Record<string, ShortcutHandler>;

interface ParsedShortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

/** Mac이면 meta, Windows/Linux면 ctrl을 'ctrl' 키로 처리 */
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function parseShortcut(combo: string): ParsedShortcut {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  return {
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key,
  };
}

function matchesEvent(parsed: ParsedShortcut, e: KeyboardEvent): boolean {
  const eventKey = e.key.toLowerCase();

  // ctrl 토큰: Mac이면 metaKey, 아니면 ctrlKey
  const primaryMod = isMac ? e.metaKey : e.ctrlKey;
  const ctrlMatch = parsed.ctrl ? primaryMod : !primaryMod;
  const altMatch = parsed.alt ? e.altKey : !e.altKey;
  const shiftMatch = parsed.shift ? e.shiftKey : !e.shiftKey;

  // ctrl 명시하지 않았을 때 meta(Mac) / ctrl(Win) 눌린 경우 무시
  if (!parsed.ctrl && primaryMod) return false;

  return ctrlMatch && altMatch && shiftMatch && eventKey === parsed.key;
}

/**
 * 글로벌 keydown 단축키 훅
 * - useEffect로 keydown 이벤트 리스너 등록/해제
 * - 플랫폼 감지: Mac이면 meta, Windows/Linux면 ctrl
 * - 입력 필드 포커스 중 modifier 없는 단축키 무시 (Escape는 항상 허용)
 * - e.preventDefault()로 브라우저 기본 동작 방지
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+k': () => focusSearch(),
 *   'alt+1': () => navigate('/dashboard'),
 *   'ctrl+enter': () => handleSave(),
 *   'escape': () => handleClose(),
 * });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  // ref로 최신 shortcuts 참조 유지 (리렌더링 시 이벤트 리스너 재등록 불필요)
  const shortcutsRef = useRef<ShortcutMap>(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = shortcutsRef.current;

      for (const [combo, callback] of Object.entries(current)) {
        const parsed = parseShortcut(combo);

        // 입력 필드 포커스 중: modifier 없는 단축키 무시 (Escape는 항상 허용)
        const isInputFocused =
          e.target instanceof HTMLElement &&
          (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT' ||
            e.target.isContentEditable);

        const hasModifier = parsed.ctrl || parsed.alt || parsed.shift;
        const isEscape = parsed.key === 'escape';

        if (isInputFocused && !hasModifier && !isEscape) continue;

        if (matchesEvent(parsed, e)) {
          e.preventDefault();
          callback(e);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // 마운트/언마운트 시 한 번만 등록
}
