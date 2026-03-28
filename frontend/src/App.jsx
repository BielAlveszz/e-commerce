import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Páginas Públicas
import Index from './pages/index';
import ProdutoDetalhe from './pages/ProdutoDetalhe';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage        from './pages/NotFoundPage';
import EsqueciSenhaPage    from './pages/EsqueciSenhaPage';
import RedefinirSenhaPage  from './pages/RedefinirSenhaPage';

// Páginas Protegidas de Cliente
import MinhaContaPage from './pages/MinhaContaPage';
import CheckoutPage from './pages/CheckoutPage';

// Páginas Protegidas de Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminProductForm from './pages/AdminProductForm';
import AdminCategoryPage from './pages/AdminCategoryPage';
import AdminCuponsPage    from './pages/AdminCuponsPage';

import './index.css';

function App() {
  return (
    <Routes>
      {/* Rotas públicas com layout principal */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="produto/:id" element={<ProdutoDetalhe />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro"        element={<RegisterPage />} />
        <Route path="esqueci-senha"    element={<EsqueciSenhaPage />} />
        <Route path="redefinir-senha"  element={<RedefinirSenhaPage />} />

        {/* Rotas protegidas de cliente */}
        <Route path="minha-conta" element={<ProtectedRoute><MinhaContaPage /></ProtectedRoute>} />
        <Route path="checkout"    element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />

        {/* 404 — captura qualquer rota não reconhecida dentro do layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Rotas de admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        {/* Redireciona /admin para /admin/dashboard */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"          element={<AdminDashboard />} />
        <Route path="pedidos"            element={<AdminOrdersPage />} />
        <Route path="produtos"           element={<AdminProductsPage />} />
        <Route path="categorias"         element={<AdminCategoryPage />} />
        <Route path="produtos/novo"      element={<AdminProductForm />} />
        <Route path="produtos/editar/:id" element={<AdminProductForm />} />
        <Route path="cupons"                element={<AdminCuponsPage />} />
      </Route>
    </Routes>
  );
}

export default App;