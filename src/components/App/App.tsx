import { SearchPage } from '../../pages/SearchPage/SearchPage.tsx';
import { PageBackdrop } from '../PageBackdrop/PageBackdrop';

export default function App() {
  return (
    <div className="relative isolate min-h-svh">
      <PageBackdrop />
      <SearchPage />
    </div>
  );
}
