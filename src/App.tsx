import { type ComponentType, type SVGProps } from 'react';
import { BookIcon, JarIcon, LoafIcon } from './components/Icons';
import { usePersistentState } from './hooks/usePersistentState';
import { FormulaReference } from './features/reference/FormulaReference';
import { RecipeCalculator } from './features/recipe/RecipeCalculator';
import { StarterTab } from './features/starter/StarterTab';

type TabId = 'recipe' | 'starter' | 'reference';

const TABS: { id: TabId; label: string; short: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'recipe', label: 'Recipe Calculator', short: 'Recipe', Icon: LoafIcon },
  { id: 'starter', label: 'Starter & Levain', short: 'Starter', Icon: JarIcon },
  { id: 'reference', label: 'How it works', short: 'Help', Icon: BookIcon },
];

const parseTab = (raw: unknown): TabId => (TABS.some((t) => t.id === raw) ? (raw as TabId) : 'recipe');

export function App() {
  const [tab, setTab] = usePersistentState('easydough.tab', parseTab);
  const open = (id: TabId) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
          <div>
            <h1>EasyDough</h1>
            <p>Sourdough calculator</p>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map(({ id, label, short, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={tab === id ? 'is-active' : ''}
              onClick={() => open(id)}
            >
              <Icon />
              <span className="tabs__long">{label}</span>
              <span className="tabs__short">{short}</span>
            </button>
          ))}
        </nav>
      </header>

      <main id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="app-main">
        {tab === 'recipe' && <RecipeCalculator onOpenStarter={() => open('starter')} />}
        {tab === 'starter' && <StarterTab />}
        {tab === 'reference' && <FormulaReference />}
      </main>
    </div>
  );
}
