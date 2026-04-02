import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './lib/firebase';
import './styles/index.css';

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');

  if (!root) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  console.log('✅ script validated');
});
