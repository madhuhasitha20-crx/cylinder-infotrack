
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical Error: Root element '#root' not found in document. The application cannot mount.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Fatal error during React initialization:", err);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #8B3A3A; border-radius: 8px; margin: 20px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">Application Load Error</h2>
        <p>There was a problem starting the application. Please check the browser console for details.</p>
      </div>
    `;
  }
}
