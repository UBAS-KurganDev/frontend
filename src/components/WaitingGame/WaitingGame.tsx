import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Gamepad2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface Props {
  status: 'idle' | 'loading' | 'ready' | 'error';
  onViewResults: () => void;
}

export function WaitingGame({ status, onViewResults }: Props) {
  const [opened, setOpened] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(440);
  const [gameError, setGameError] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const focusGame = () => {
    frameRef.current?.focus({ preventScroll: true });
    frameRef.current?.contentWindow?.postMessage(
      { type: 'ubas-2048-focus' },
      window.location.origin,
    );
  };

  useEffect(() => {
    const receiveMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (data.type === 'ubas-2048-size' && 'height' in data && typeof data.height === 'number') {
        if (Number.isFinite(data.height)) setHeight(Math.min(900, Math.max(250, data.height)));
      }
      if (data.type === 'ubas-2048-exit') {
        setOpened(false);
        openButtonRef.current?.focus();
      }
      if (data.type === 'ubas-2048-error') setGameError(true);
      if (data.type === 'ubas-2048-recovered') setGameError(false);
    };
    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, []);

  if (status !== 'loading' && !mounted) return null;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Gamepad2 className="size-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                2048 во время ожидания
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {status === 'loading'
                  ? 'Поиск продолжается независимо от игры.'
                  : status === 'ready'
                    ? gameError
                      ? 'Результаты готовы. Можно начать новую игру или перейти к выдаче.'
                      : 'Результаты готовы. Можно закончить партию или перейти к выдаче.'
                    : 'Можно продолжить партию или повторить поиск.'}
              </p>
            </div>
          </div>
          <Button
            ref={openButtonRef}
            type="button"
            variant="outline"
            aria-expanded={opened}
            aria-controls="waiting-game"
            onClick={() => {
              if (opened) {
                setOpened(false);
              } else {
                setMounted(true);
                setOpened(true);
                requestAnimationFrame(focusGame);
              }
            }}
          >
            {opened ? 'Скрыть игру' : mounted ? 'Продолжить 2048' : 'Сыграть в 2048'}
          </Button>
        </div>
        {mounted && status === 'ready' && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/50 p-4"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <CircleCheck
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                {gameError
                  ? 'Поиск завершён. Результаты готовы.'
                  : 'Поиск завершён. Ваша партия сохранена.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setOpened(false);
                onViewResults();
              }}
            >
              Посмотреть результаты
            </Button>
          </div>
        )}
        {mounted && status === 'error' && (
          <p role="status" className="text-sm text-muted-foreground">
            Поиск завершился с ошибкой. Можно продолжить игру или повторить поиск.
          </p>
        )}
        <div id="waiting-game" hidden={!opened} className="mx-auto w-full max-w-xl">
          {mounted && (
            <iframe
              ref={frameRef}
              title="Игра 2048"
              src={`${import.meta.env.BASE_URL}2048.html`}
              height={height}
              className="block w-full border-0"
              onLoad={() => {
                if (opened) focusGame();
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
