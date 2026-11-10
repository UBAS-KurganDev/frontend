import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../components/ui/button';

export class GameErrorBoundary extends Component<
  { children: ReactNode; onRestart: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    window.parent.postMessage({ type: 'ubas-2048-error' }, window.location.origin);
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">Не удалось продолжить партию.</p>
          <p className="text-sm text-muted-foreground">
            Ошибка игры не останавливает поиск. Можно начать новую игру.
          </p>
          <Button type="button" onClick={this.props.onRestart}>
            Начать новую игру
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
