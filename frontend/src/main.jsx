import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BookingCartProvider } from './context/BookingCartContext.jsx';
import { HealthcareFallAlertsProvider } from './healthcare/HealthcareFallAlertsContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/healthcare">
      <ThemeProvider>
        <AuthProvider>
          <BookingCartProvider>
            <HealthcareFallAlertsProvider>
              <App />
            </HealthcareFallAlertsProvider>
          </BookingCartProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              className: 'dark:!bg-glass-elevated dark:!text-foreground dark:!border-glass-border',
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
