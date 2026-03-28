import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/Api';

const EsqueciSenhaPage = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await apiFetch('/api/clientes/solicitar-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEnviado(true);
    } catch (err) {
      setError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="auth-page text-center">
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--meby-rosa-claro)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28,
          }}
        >
          ✉️
        </div>
        <h2 className="mb-3">Verifique seu email</h2>
        <p className="text-muted mb-4" style={{ lineHeight: 1.7 }}>
          Se o email <strong>{email}</strong> estiver cadastrado,
          você receberá as instruções para redefinir sua senha em breve.
          <br /><br />
          Não esqueça de verificar a pasta de spam.
        </p>
        <Link to="/login" className="btn btn-dark-custom w-100">
          Voltar para o Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h2 className="text-center mb-2">Esqueci minha senha</h2>
      <p className="text-muted text-center mb-4" style={{ fontSize: '0.95rem' }}>
        Informe seu email e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-floating mb-3">
          <input
            type="email"
            className="form-control"
            id="email"
            placeholder="nome@exemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label htmlFor="email">Email cadastrado</label>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-grid mb-3">
          <button type="submit" className="btn btn-dark-custom btn-lg" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Enviando...</>
              : 'Enviar link de redefinição'
            }
          </button>
        </div>

        <p className="text-center text-muted" style={{ fontSize: '0.9rem' }}>
          Lembrou a senha?{' '}
          <Link to="/login">Fazer login</Link>
        </p>
      </form>
    </div>
  );
};

export default EsqueciSenhaPage;