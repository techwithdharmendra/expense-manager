import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

try {
  // Request persistent storage to ensure the browser/WebView doesn't clear the database
  if (window.navigator?.storage?.persist) {
    window.navigator.storage.persist().then(persistent => {
      if (persistent) {
        console.log('Persistent storage enabled: Data will not be cleared by the OS.');
      } else {
        console.log('Persistent storage not granted.');
      }
    }).catch(console.error);
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  }
} catch (error) {
  const err = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>App Failed to Start</h1><p>${err}</p></div>`;
  console.error("Critical Startup Error:", error);
}
