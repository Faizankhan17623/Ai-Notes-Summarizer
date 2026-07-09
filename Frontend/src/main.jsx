import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import { store } from './store.js'

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" reverseOrder={true} toastOptions={{
          style: { background: '#2C333F', color: '#F1F2FF' }
        }} />
      </BrowserRouter>
    </Provider>
  </HelmetProvider>
)
