import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import Maintenance from './views/Maintenance';
import Enviados from './views/Enviados';
import Sutran from './views/Sutran';
import Sedes from './views/Sedes';
import MTCAccesos from './views/MTCAccesos';
import Users from './views/Users';
import Audit from './views/Audit';
import SystemIntegrity from './components/SystemIntegrity';
import DiagnosticPanel from './components/DiagnosticPanel';
import ConnectionTest from './components/ConnectionTest';
import QuickDiagnostic from './components/QuickDiagnostic';
import Cameras from './views/Cameras';
import Servers from './views/Servers';
import FlotaVehicular from './views/FlotaVehicular';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import PasswordSetup from './components/PasswordSetup';
import Checklist from './views/Checklist';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading, hasPermission, needsPasswordSetup } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Mostrar configuración de contraseñas si es necesario
  if (needsPasswordSetup) {
    return <PasswordSetup />;
  }

  // Mostrar login si no hay usuario autenticado
  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    // Verificar permisos antes de renderizar
    if (!hasPermission(activeView)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
              <p>No tienes permisos para acceder a esta sección.</p>
            </div>
          </div>
        </div>
      );
    }

    // Rutas de inventario por categoría
    if (activeView.startsWith('inventory-')) {
      if (activeView === 'inventory-camara') {
        return <Cameras />;
      }
      return <Inventory categoryFilter={activeView} />;
    }

    // Rutas de cámaras por categoría (usar vista dedicada que mantiene cards completas)
    if (activeView.startsWith('cameras-')) {
      return <Cameras subview={activeView} />;
    }

    // Rutas de mantenimiento por categoría
    if (activeView.startsWith('maintenance-')) {
      return <Maintenance categoryFilter={activeView} />;
    }

    // Rutas de envíos por ubicación
    if (activeView.startsWith('sent-')) {
      return <Enviados locationFilter={activeView} />;
    }

    // Rutas de checklist
    if (activeView === 'checklist') {
      return <Checklist />;
    }
    if (activeView.startsWith('checklist-')) {
      const type = activeView.replace('checklist-', '');
      return <Checklist type={type} />;
    }

    // Rutas principales
    switch (activeView) {
      case 'dashboard':
        return <Dashboard
          onShowDiagnostic={() => setActiveView('diagnostic')}
          onShowConnectionTest={() => setActiveView('connection-test')}
          onShowQuickDiagnostic={() => setActiveView('quick-diagnostic')}
        />;
      case 'inventory':
      case 'inventory-all':
        return <Inventory />;
      case 'cameras':
      case 'cameras-all':
        return <Cameras />;
      case 'maintenance':
      case 'maintenance-all':
        return <Maintenance />;
      case 'sent':
      case 'sent-all':
        return <Enviados />;
      case 'sutran':
        return <Sutran />;
      case 'locations':
        return <Sedes />;
      case 'mtc':
        return <MTCAccesos />;
      case 'users':
        return <Users />;
      case 'servers':
        return <Servers />;
      case 'flota-vehicular':
        return <FlotaVehicular />;
      case 'audit':
        return <Audit />;
      case 'integrity':
        return <SystemIntegrity />;
      case 'diagnostic':
        return <DiagnosticPanel />;
      case 'connection-test':
        return <ConnectionTest />;
      case 'quick-diagnostic':
        return <QuickDiagnostic />;
      case 'checklist':
        return <Checklist />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`overflow-y-auto transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
