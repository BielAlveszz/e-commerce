import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IMaskInput } from 'react-imask';
import { API_URL, apiFetch } from '../services/Api';

const RegisterPage = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Remove máscara do CPF antes de enviar — backend espera 11 dígitos numéricos
    const cpfSomenteNumeros = cpf.replace(/\D/g, '');

    try {
      const response = await apiFetch('/api/clientes/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, telefone, cpf: cpfSomenteNumeros }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Exibe erros detalhados do Zod quando disponíveis
        const mensagem = data.erros
          ? data.erros.map(e => e.message).join(', ')
          : data.message || 'Falha no cadastro';
        throw new Error(mensagem);
      }
      setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="text-center mb-4">Criar Conta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-floating mb-3">
          <input type="text" className="form-control" id="nome" placeholder="Nome completo"
            value={nome} onChange={(e) => setNome(e.target.value)} required />
          <label htmlFor="nome">Nome completo</label>
        </div>
        <div className="form-floating mb-3">
          <input type="email" className="form-control" id="email" placeholder="nome@exemplo.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="email">Email</label>
        </div>
        <div className="form-floating mb-3">
          <IMaskInput
            mask="000.000.000-00"
            value={cpf}
            onAccept={(value) => setCpf(value)}
            type="text"
            className="form-control"
            id="cpf"
            placeholder="CPF"
            required
          />
          <label htmlFor="cpf">CPF</label>
        </div>
        <div className="form-floating mb-3">
          <input type="password" className="form-control" id="senha" placeholder="Senha"
            value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <label htmlFor="senha">Senha (mín. 8 caracteres)</label>
        </div>
        <div className="form-floating mb-3">
          <input type="tel" className="form-control" id="telefone" placeholder="(11) 99999-8888"
            value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <label htmlFor="telefone">Telefone (opcional)</label>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="d-grid">
          <button type="submit" className="btn btn-dark btn-lg" disabled={loading}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cadastrando...</>
            ) : 'Cadastrar'}
          </button>
        </div>
        <p className="mt-3 text-center">
          Já tem uma conta? <Link to="/login">Faça o login</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;