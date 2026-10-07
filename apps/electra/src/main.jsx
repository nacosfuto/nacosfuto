import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App, { ElectraErrorBoundary } from './App.jsx';
import './index.css';

// Ensure basename is clean and never has an incompatible trailing slash in React Router v6
const isNestedUnderElectra = typeof window !== 'undefined' && window.location.pathname.startsWith('/electra');
const rawBase = import.meta.env.BASE_URL || '/';
const cleanBase = isNestedUnderElectra 
  ? '/electra' 
  : (rawBase.endsWith('/') && rawBase.length > 1 ? rawBase.slice(0, -1) : rawBase);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ElectraErrorBoundary>
      <ThemeProvider>
        <BrowserRouter basename={cleanBase}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ElectraErrorBoundary>
  </React.StrictMode>
);
