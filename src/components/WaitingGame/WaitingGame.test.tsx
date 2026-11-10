// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaitingGame } from './WaitingGame';

afterEach(cleanup);

describe('WaitingGame', () => {
  it('loads on demand and keeps the same game when a query completes, hides, and resumes', () => {
    const onViewResults = vi.fn();
    const { rerender } = render(<WaitingGame status="idle" onViewResults={onViewResults} />);
    expect(screen.queryByTitle('Игра 2048')).toBeNull();
    rerender(<WaitingGame status="loading" onViewResults={onViewResults} />);
    expect(screen.queryByTitle('Игра 2048')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Сыграть в 2048' }));
    const frame = screen.getByTitle('Игра 2048');
    rerender(<WaitingGame status="ready" onViewResults={onViewResults} />);
    expect(screen.getByTitle('Игра 2048')).toBe(frame);
    expect(screen.getByText('Поиск завершён. Ваша партия сохранена.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Посмотреть результаты' }));
    expect(onViewResults).toHaveBeenCalledOnce();
    expect(frame).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить 2048' }));
    expect(screen.getByTitle('Игра 2048')).toBe(frame);
    expect(frame).toBeVisible();
    rerender(<WaitingGame status="loading" onViewResults={onViewResults} />);
    expect(screen.getByTitle('Игра 2048')).toBe(frame);
    expect(screen.queryByRole('button', { name: 'Посмотреть результаты' })).toBeNull();
  });

  it('keeps a running game available after search failure', () => {
    const { rerender } = render(<WaitingGame status="loading" onViewResults={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Сыграть в 2048' }));
    const frame = screen.getByTitle('Игра 2048');
    rerender(<WaitingGame status="error" onViewResults={vi.fn()} />);
    expect(screen.getByTitle('Игра 2048')).toBe(frame);
    expect(screen.getByText(/Поиск завершился с ошибкой/)).toBeVisible();
  });

  it('does not promise a saved party after the game reports a crash', () => {
    const onViewResults = vi.fn();
    const { rerender } = render(<WaitingGame status="loading" onViewResults={onViewResults} />);
    fireEvent.click(screen.getByRole('button', { name: 'Сыграть в 2048' }));
    const frame = screen.getByTitle<HTMLIFrameElement>('Игра 2048');
    rerender(<WaitingGame status="ready" onViewResults={onViewResults} />);
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: window.location.origin,
        source: frame.contentWindow,
        data: { type: 'ubas-2048-error' },
      }),
    );
    expect(screen.queryByText('Поиск завершён. Ваша партия сохранена.')).toBeNull();
    expect(screen.getByText('Поиск завершён. Результаты готовы.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Посмотреть результаты' }));
    expect(onViewResults).toHaveBeenCalledOnce();
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: window.location.origin,
        source: frame.contentWindow,
        data: { type: 'ubas-2048-recovered' },
      }),
    );
    expect(screen.getByText('Поиск завершён. Ваша партия сохранена.')).toBeVisible();
  });

  it('accepts size messages only from its own game frame and origin', () => {
    render(<WaitingGame status="loading" onViewResults={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Сыграть в 2048' }));
    const frame = screen.getByTitle<HTMLIFrameElement>('Игра 2048');
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: 'https://unrelated.example',
        source: frame.contentWindow,
        data: { type: 'ubas-2048-size', height: 700 },
      }),
    );
    expect(frame.height).toBe('440');
    fireEvent(
      window,
      new MessageEvent('message', {
        origin: window.location.origin,
        source: frame.contentWindow,
        data: { type: 'ubas-2048-size', height: 550 },
      }),
    );
    expect(frame.height).toBe('550');
  });
});
