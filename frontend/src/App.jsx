import { Routes, Route } from 'react-router-dom';
// Layouts
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout'; // Importe o layout de admin
import ProtectedRoute from './components/ProtectedRoute';

// Páginas Públicas
import Index from './pages/index';
import ProdutoDetalhe from './pages/ProdutoDetalhe';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Páginas Protegidas de Cliente
import MinhaContaPage from './pages/MinhaContaPage';
import CheckoutPage from './pages/CheckoutPage';

// Páginas Protegidas de Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductForm from './pages/AdminProductForm';
import AdminCategoryPage from './pages/AdminCategoryPage';

import './index.css';

function App() {
  return (
    <Routes>
      {/* Rotas Públicas com o Layout Principal */}
      <Route path="/" element={<Layout />}>
        {/* Rotas Públicas */}
        <Route index element={<Index />} />
        <Route path="produto/:id" element={<ProdutoDetalhe />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
        
        {/* Rotas Protegidas de Cliente */}
        <Route path="minha-conta" element={<ProtectedRoute><MinhaContaPage /></ProtectedRoute>} />
        <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      </Route>

      {/* Rotas Protegidas de Admin com o Layout de Admin */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="pedidos" element={<AdminOrdersPage />} />
        <Route path="categorias" element={<AdminCategoryPage />} />
        <Route path="produtos/novo" element={<AdminProductForm />} />
        <Route path="produtos/editar/:id" element={<AdminProductForm />} />
      </Route>

    </Routes>
  );
}

export default App;