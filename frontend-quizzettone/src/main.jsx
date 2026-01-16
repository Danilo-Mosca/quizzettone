import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';    // Importo il componente BrowserRouter
import './index.css';
import App from './App.jsx';

// Integro il sistema di routing nell'applicazione inglobandola nel componente <BrowserRouter> </BrowserRouter>
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
