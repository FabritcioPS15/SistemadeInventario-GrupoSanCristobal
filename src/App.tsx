import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import SpareParts from './views/SpareParts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import PasswordSetup from './components/PasswordSetup';
import Checklist from './views/Checklist';

function ProtectedRoute({ children, permission }: { children: React.ReactNode, permission?: string }) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
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

  return <>{children}</>;
}

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading, hasPermission, needsPasswordSetup } = useAuth();
  const location = useLocation();

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

  // Si no hay usuario y no estamos en login, redirigir a login
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario y estamos en login, redirigir a dashboard
  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // Si no hay usuario y estamos en login, mostrar Login
  if (!user && location.pathname === '/login') {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`overflow-y-auto transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute permission="dashboard"><Dashboard /></ProtectedRoute>} />

          {/* Inventario */}
          <Route path="/inventory" element={<ProtectedRoute permission="inventory"><Inventory /></ProtectedRoute>} />
          <Route path="/inventory/all" element={<ProtectedRoute permission="inventory-all"><Inventory /></ProtectedRoute>} />
          <Route path="/inventory/camara" element={<ProtectedRoute permission="inventory-camara"><Cameras /></ProtectedRoute>} />
          <Route path="/inventory/:category" element={<ProtectedRoute><InventoryWrapper /></ProtectedRoute>} />

          {/* Cámaras */}
          <Route path="/cameras" element={<ProtectedRoute permission="cameras"><Cameras /></ProtectedRoute>} />
          <Route path="/cameras/all" element={<ProtectedRoute permission="cameras-all"><Cameras /></ProtectedRoute>} />
          <Route path="/cameras/:subview" element={<ProtectedRoute><CamerasWrapper /></ProtectedRoute>} />

          {/* Mantenimiento */}
          <Route path="/maintenance" element={<ProtectedRoute permission="maintenance"><Maintenance /></ProtectedRoute>} />
          <Route path="/maintenance/all" element={<ProtectedRoute permission="maintenance-all"><Maintenance /></ProtectedRoute>} />
          <Route path="/maintenance/:category" element={<ProtectedRoute><MaintenanceWrapper /></ProtectedRoute>} />

          {/* Enviados */}
          <Route path="/sent" element={<ProtectedRoute permission="sent"><Enviados /></ProtectedRoute>} />
          <Route path="/sent/all" element={<ProtectedRoute permission="sent-all"><Enviados /></ProtectedRoute>} />
          <Route path="/sent/:location" element={<ProtectedRoute><EnviadosWrapper /></ProtectedRoute>} />

          {/* Checklist */}
          <Route path="/checklist" element={<ProtectedRoute permission="checklist"><Checklist /></ProtectedRoute>} />
          <Route path="/checklist/:type" element={<ProtectedRoute><ChecklistWrapper /></ProtectedRoute>} />

          {/* Otras Rutas */}
          <Route path="/sutran" element={<ProtectedRoute permission="sutran"><Sutran /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute permission="locations"><Sedes /></ProtectedRoute>} />
          <Route path="/mtc" element={<ProtectedRoute permission="mtc"><MTCAccesos /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute permission="users"><Users /></ProtectedRoute>} />
          <Route path="/servers" element={<ProtectedRoute permission="servers"><Servers /></ProtectedRoute>} />
          <Route path="/flota-vehicular" element={<ProtectedRoute permission="flota-vehicular"><FlotaVehicular /></ProtectedRoute>} />
          <Route path="/spare-parts" element={<ProtectedRoute permission="spare-parts"><SpareParts /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute permission="audit"><Audit /></ProtectedRoute>} />
          <Route path="/integrity" element={<ProtectedRoute permission="integrity"><SystemIntegrity /></ProtectedRoute>} />
          <Route path="/diagnostic" element={<ProtectedRoute permission="diagnostic"><DiagnosticPanel /></ProtectedRoute>} />
          <Route path="/connection-test" element={<ProtectedRoute permission="connection-test"><ConnectionTest /></ProtectedRoute>} />
          <Route path="/quick-diagnostic" element={<ProtectedRoute permission="quick-diagnostic"><QuickDiagnostic /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Wrappers para manejar parámetros de ruta similares a activeView.startsWith
import { useParams } from 'react-router-dom';

function InventoryWrapper() {
  const { category } = useParams();
  const { hasPermission } = useAuth();
  const viewId = `inventory-${category}`;
  if (!hasPermission(viewId)) return <Navigate to="/" replace />;
  return <Inventory categoryFilter={viewId} />;
}

function CamerasWrapper() {
  const { subview } = useParams();
  const { hasPermission } = useAuth();
  const viewId = `cameras-${subview}`;
  if (!hasPermission(viewId)) return <Navigate to="/" replace />;
  return <Cameras subview={viewId} />;
}

function MaintenanceWrapper() {
  const { category } = useParams();
  const { hasPermission } = useAuth();
  const viewId = `maintenance-${category}`;
  if (!hasPermission(viewId)) return <Navigate to="/" replace />;
  return <Maintenance categoryFilter={viewId} />;
}

function EnviadosWrapper() {
  const { location } = useParams();
  const { hasPermission } = useAuth();
  const viewId = `sent-${location}`;
  if (!hasPermission(viewId)) return <Navigate to="/" replace />;
  return <Enviados locationFilter={viewId} />;
}

function ChecklistWrapper() {
  const { type } = useParams();
  const { hasPermission } = useAuth();
  const viewId = `checklist-${type}`;
  if (!hasPermission(viewId)) return <Navigate to="/" replace />;
  return <Checklist type={type} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
