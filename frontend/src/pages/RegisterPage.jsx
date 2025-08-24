import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3001/api/clientes/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, telefone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha no cadastro');
      }
      setSuccess('Cadastro realizado com sucesso! Você será redirecionado para o login em 2 segundos.');
      // Redireciona para o login após 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <h2 className="text-center mb-4">Criar Conta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-floating mb-3">
          <input type="text" className="form-control" id="nome" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <label htmlFor="nome">Nome completo</label>
        </div>
        <div className="form-floating mb-3">
          <input type="email" className="form-control" id="email" placeholder="nome@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="email">Email</label>
        </div>
        <div className="form-floating mb-3">
          <input type="password" className="form-control" id="senha" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <label htmlFor="senha">Senha</label>
        </div>
         <div className="form-floating mb-3">
          <input type="tel" className="form-control" id="telefone" placeholder="(11) 99999-8888" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <label htmlFor="telefone">Telefone (Opcional)</label>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="d-grid">
          <button type="submit" className="btn btn-dark btn-lg">Cadastrar</button>
        </div>
        <p className="mt-3 text-center">
          Já tem uma conta? <Link to="/login">Faça o login</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;