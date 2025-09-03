import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import gcLogo from './assets/GC.jpg'

// Initialize theme (light/dark) before React renders
try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = saved ? (saved === 'dark') : prefersDark;
    document.documentElement.classList.toggle('dark', !!useDark);
} catch {}

// Ensure tab title and favicon
try {
    if (document && document.title !== 'Global Connect') {
        document.title = 'Global Connect';
    }
    const setFavicon = (href) => {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'icon');
            document.head.appendChild(link);
        }
        link.setAttribute('type', 'image/png');
        link.setAttribute('href', href);
    };
    if (gcLogo) setFavicon(gcLogo);
} catch {}
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import AuthContext from './context/AuthContext.jsx'
import UserContext from './context/UserContext.jsx'
import { ToastProvider } from './components/ui/ToastProvider.jsx'
import { ConfirmProvider } from './components/ui/ConfirmDialog.jsx'


createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <AuthContext>
            <UserContext>
                <ToastProvider>
                    <ConfirmProvider>
                        <App />
                    </ConfirmProvider>
                </ToastProvider>
            </UserContext>
        </AuthContext>
    </BrowserRouter>
)
