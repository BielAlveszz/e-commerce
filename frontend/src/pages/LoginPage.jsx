import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/Api';

const LoginPage = () => {
    const [email, setEmail]   = useState('');
    const [senha, setSenha]   = useState('');
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const { login }               = useAuth();
    const { cartItems, mergeLocalCartOnLogin } = useCart();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Captura os itens anônimos antes do login limpar o estado
            const localItems = [...cartItems];

            const res  = await apiFetch('/api/clientes/login', {
                method: 'POST',
                body:   JSON.stringify({ email, senha }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Falha no login.');

            // Seta o usuário no contexto (token ficou no httpOnly cookie)
            login(data.user);

            // Faz o merge do carrinho anônimo com o carrinho do banco
            if (localItems.length > 0) {
                await mergeLocalCartOnLogin(localItems);
            }

            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <h2 className="text-center mb-4">Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-floating mb-3">
                    <input type="email" className="form-control" id="email" placeholder="nome@exemplo.com"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                    <label htmlFor="email">Email</label>
                </div>
                <div className="form-floating mb-3">
                    <input type="password" className="form-control" id="senha" placeholder="Senha"
                        value={senha} onChange={e => setSenha(e.target.value)} required />
                    <label htmlFor="senha">Senha</label>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="d-grid">
                    <button type="submit" className="btn btn-dark btn-lg" disabled={loading}>
                        {loading
                            ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Entrando...</>
                            : 'Entrar'
                        }
                    </button>
                </div>
                <div className="d-flex justify-content-between mt-3">
                    <Link to="/esqueci-senha" className="text-muted" style={{ fontSize: '0.875rem' }}>Esqueci minha senha</Link>
                    <Link to="/cadastro" style={{ fontSize: '0.875rem' }}>Criar conta</Link>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;