import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { OverlayProvider } from './contexts/OverlayContext';
import { SignupProvider } from './components/signup';
import { UpdatePrompt, OfflineSync } from './components/pwa';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { PatronView } from './views/PatronView';
import { StaffView } from './views/StaffView';
import { WaiterView } from './views/WaiterView';
import { ManagerView } from './views/ManagerView';
import { BrandView } from './views/BrandView';
import { VendorView } from './views/VendorView';
import { AdminView } from './views/AdminView';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <OverlayProvider>
          <UpdatePrompt />
          <OfflineSync />
          <SignupProvider>
            <Routes>
              <Route path="/" element={<LoginView />} />
              <Route path="/onboarding" element={<OnboardingView />} />
              <Route path="/patron/*" element={<PatronView />} />
              <Route path="/staff/*" element={<StaffView />} />
              <Route path="/waiter/*" element={<WaiterView />} />
              <Route path="/manager/*" element={<ManagerView />} />
              <Route path="/brand/*" element={<BrandView />} />
              <Route path="/vendor/*" element={<VendorView />} />
              <Route path="/admin/*" element={<AdminView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SignupProvider>
        </OverlayProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
