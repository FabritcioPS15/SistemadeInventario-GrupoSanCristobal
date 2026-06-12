import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './app/providers/AuthContext';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </AuthProvider>
  </BrowserRouter>
);
