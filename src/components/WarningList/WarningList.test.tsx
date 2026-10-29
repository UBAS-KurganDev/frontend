// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WarningList } from './WarningList';

afterEach(cleanup);

describe('WarningList', () => {
  it('preserves readable messages and groups repeated unknown codes into a readable note', () => {
    render(<WarningList warnings={[
      ' new_provider_warning ', 'new_provider_warning', 'another_unknown_warning',
      'Часть поставщиков недоступна.', 'Часть поставщиков недоступна.', '', '  ',
    ]} />);
    const notes = screen.getByRole('list', { name: 'Примечания' });
    expect(within(notes).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Для результата поиска есть дополнительные примечания.')).toBeTruthy();
    expect(screen.getByText('Часть поставщиков недоступна.')).toBeTruthy();
    expect(screen.queryByText('new_provider_warning')).toBeNull();
    expect(screen.queryByText('another_unknown_warning')).toBeNull();
  });

  it('does not render an empty notice when warnings are missing or blank', () => {
    const { container, rerender } = render(<WarningList />);
    expect(container.childElementCount).toBe(0);
    rerender(<WarningList warnings={['', '  ']} />);
    expect(container.childElementCount).toBe(0);
  });
});
