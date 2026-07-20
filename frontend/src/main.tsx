import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Provider } from 'react-redux';
import { store } from './store';
import { initAuthFromStorage } from './hooks/useAuth';
import { MaintenanceProvider } from './context/MaintenanceContext';

// Hydrate auth state from localStorage
initAuthFromStorage(store.dispatch);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MaintenanceProvider>
          <App />
        </MaintenanceProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
);

