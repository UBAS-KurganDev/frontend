// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GameErrorBoundary } from './GameErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('keeps recovery controls visible when the game throws and allows a fresh game', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const notifyParent = vi.spyOn(window.parent, 'postMessage');
  const restart = vi.fn();
  function BrokenGame(): never {
    throw new Error('Tile is missing');
  }
  const { rerender } = render(
    <GameErrorBoundary key="failed" onRestart={restart}>
      <BrokenGame />
    </GameErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось продолжить партию.');
  expect(notifyParent).toHaveBeenCalledWith({ type: 'ubas-2048-error' }, window.location.origin);
  fireEvent.click(screen.getByRole('button', { name: 'Начать новую игру' }));
  expect(restart).toHaveBeenCalledOnce();
  rerender(
    <GameErrorBoundary key="fresh" onRestart={restart}>
      Новое поле
    </GameErrorBoundary>,
  );
  expect(screen.getByText('Новое поле')).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});
