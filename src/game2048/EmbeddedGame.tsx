import { useCallback, useEffect, useRef, useState } from 'react';
import { Game2048 } from 'react-2048';
import { RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { GameErrorBoundary } from './GameErrorBoundary';

const translations: Readonly<Record<string, string>> = {
  Score: 'Счёт',
  'Ready to play?': 'Готовы сыграть?',
  'Start game': 'Начать игру',
  'You won!': 'Вы победили!',
  'You lost!': 'Ходы закончились',
  'Play again': 'Ещё раз',
};

export function EmbeddedGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState(0);
  const [compact, setCompact] = useState(() => !window.matchMedia('(min-width: 300px)').matches);
  const focusBoard = useCallback(() => boardRef.current?.focus({ preventScroll: true }), []);
  const restart = () => {
    setSession((value) => value + 1);
    window.parent.postMessage({ type: 'ubas-2048-recovered' }, window.location.origin);
  };

  useEffect(() => {
    const media = window.matchMedia('(min-width: 300px)');
    const updateSize = () => setCompact(!media.matches);
    media.addEventListener('change', updateSize);
    return () => media.removeEventListener('change', updateSize);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // The pinned package has English labels but no localization API.
    const translate = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        const replacement = translations[text.nodeValue?.trim() ?? ''];
        if (replacement) text.nodeValue = replacement;
      }
    };
    const textObserver = new MutationObserver(translate);
    textObserver.observe(root, { childList: true, characterData: true, subtree: true });
    translate();
    const sizeObserver = new ResizeObserver(() => {
      window.parent.postMessage(
        { type: 'ubas-2048-size', height: Math.ceil(root.getBoundingClientRect().height) },
        window.location.origin,
      );
    });
    sizeObserver.observe(root);
    return () => {
      textObserver.disconnect();
      sizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Keep the package's window-wide preventDefault away from Tab, buttons and text fields.
    const filterKeys = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        window.parent.postMessage({ type: 'ubas-2048-exit' }, window.location.origin);
      }
      const isMove = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code);
      if (
        !isMove ||
        document.activeElement !== boardRef.current ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        event.stopImmediatePropagation();
      }
    };
    const receiveFocus = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data && data.type === 'ubas-2048-focus') {
        const button = boardRef.current?.querySelector('button');
        if (button) button.focus({ preventScroll: true });
        else focusBoard();
      }
    };
    window.addEventListener('keydown', filterKeys, true);
    window.addEventListener('message', receiveFocus);
    return () => {
      window.removeEventListener('keydown', filterKeys, true);
      window.removeEventListener('message', receiveFocus);
    };
  }, [focusBoard]);

  return (
    <div ref={rootRef} className="embedded-2048 mx-auto max-w-[488px] space-y-4 p-1">
      <div
        ref={boardRef}
        role="group"
        aria-label="Поле 2048"
        tabIndex={0}
        className="mx-auto w-fit rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        onPointerDown={(event) => {
          if (!(event.target as Element).closest('button')) focusBoard();
        }}
      >
        <GameErrorBoundary key={session} onRestart={restart}>
          <Game2048
            size={compact ? 'sm' : 'md'}
            className="ubas-2048-game"
            onGameStart={focusBoard}
          />
        </GameErrorBoundary>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Соединяйте одинаковые числа. Управление: стрелки на клавиатуре или свайпы по полю.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={restart}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Новая игра
        </Button>
      </div>
    </div>
  );
}
