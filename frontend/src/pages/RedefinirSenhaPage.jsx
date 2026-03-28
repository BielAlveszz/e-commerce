import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../services/Api';

const RedefinirSenhaPage = () => {
  const [searchParams]        = useSearchParams();
  const token                 = searchParams.get('token');
  const navigate              = useNavigate();

  const [novaSenha, setNovaSenha]           = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [sucesso, setSucesso]               = useState(false);

  // Se não tiver token na URL, redireciona para a tela de esqueci senha
  useEffect(() => {
    if (!token) navigate('/esqueci-senha', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (novaSenha !== confirmarSenha) {
      return setError('As senhas não coincidem.');
    }

    setLoading(true);
    try {
      const res  = await apiFetch('/api/clientes/resetar-senha', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSucesso(true);
      // Redireciona para o login após 3 segundos
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="auth-page text-center">
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#d4edda',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28,
          }}
        >
          ✅
        </div>
        <h2 className="mb-3">Senha redefinida!</h2>
        <p className="text-muted mb-4">
          Sua senha foi atualizada com sucesso.
          <br />
          Você será redirecionado para o login em instantes...
        </p>
        <Link to="/login" className="btn btn-dark-custom w-100">
          Ir para o Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h2 className="text-center mb-2">Redefinir senha</h2>
      <p className="text-muted text-center mb-4" style={{ fontSize: '0.95rem' }}>
        Crie uma nova senha para sua conta.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-floating mb-3">
          <input
            type="password"
            className={`form-control ${error && novaSenha ? 'is-invalid' : ''}`}
            id="novaSenha"
            placeholder="Nova senha"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            required
          />
          <label htmlFor="novaSenha">Nova senha</label>
        </div>

        <div className="form-floating mb-1">
          <input
            type="password"
            className={`form-control ${error && confirmarSenha ? 'is-invalid' : ''}`}
            id="confirmarSenha"
            placeholder="Confirmar senha"
            value={confirmarSenha}
            onChange={e => setConfirmarSenha(e.target.value)}
            required
          />
          <label htmlFor="confirmarSenha">Confirmar nova senha</label>
        </div>

        <small className="text-muted d-block mb-3" style={{ fontSize: '0.8rem' }}>
          Mínimo 8 caracteres, uma maiúscula, uma minúscula e um número.
        </small>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-grid mb-3">
          <button type="submit" className="btn btn-dark-custom btn-lg" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Salvando...</>
              : 'Salvar nova senha'
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default RedefinirSenhaPage;