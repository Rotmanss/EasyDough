import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { RecipeProvider } from './hooks/useRecipe';
import { StarterProvider } from './hooks/useStarter';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarterProvider>
      <RecipeProvider>
        <App />
      </RecipeProvider>
    </StarterProvider>
  </StrictMode>,
);
