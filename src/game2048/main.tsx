import { createRoot } from 'react-dom/client';
import { EmbeddedGame } from './EmbeddedGame';
import '../styles/globals.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(<EmbeddedGame />);
