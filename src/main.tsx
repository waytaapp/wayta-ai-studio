import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { SystemErrorBoundary } from './components/SystemErrorBoundary';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { DynamicThemeProvider } from './contexts/DynamicThemeContext';
import { serializeError } from './lib/utils';


// Global error handlers to capture generic "Object" exceptions and descriptive runtime failures
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  console.error('🌐 UNHANDLED_PROMISE_REJECTION:', reason);
  
  if (reason && typeof reason === 'object') {
     try {
       const details = serializeError(reason);
       console.error('🔍 REJECTION_DETAILS:', JSON.stringify(details, null, 2));
     } catch (e) {
       console.error('🔍 REJECTION_OBJECT (Not Stringifiable):', reason);
     }
  }
});

window.addEventListener('error', (event) => {
  const error = event.error || event.message;
  console.error('🌐 UNCAUGHT_EXCEPTION:', error);
  if (error && typeof error === 'object') {
    try {
      const details = serializeError(error);
      console.error('🔍 EXCEPTION_DETAILS:', JSON.stringify(details, null, 2));
    } catch (e) {
      console.error('🔍 EXCEPTION_OBJECT (Not Stringifiable):', error);
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemErrorBoundary>
      <OnboardingProvider>
        <DynamicThemeProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </DynamicThemeProvider>
      </OnboardingProvider>
    </SystemErrorBoundary>
  </StrictMode>,
);

// PWA Service Worker Registration
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
*/
