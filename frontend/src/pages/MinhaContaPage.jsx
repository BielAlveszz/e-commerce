import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const MinhaContaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    // Garante que o estado de loading seja ativado no início
    setLoading(true);

    // Só tenta buscar os pedidos se o token já estiver disponível
    if (token) {
      fetch('http://localhost:3001/api/pedidos/meus-pedidos', {
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Falha ao buscar os pedidos. Tente fazer login novamente.');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
            setPedidos(data);
        }
      })
      .catch(error => {
        console.error("Erro ao buscar pedidos:", error);
        // Limpa os pedidos em caso de erro para não mostrar dados antigos
        setPedidos([]); 
      })
      .finally(() => {
        // Finaliza o carregamento, com sucesso ou erro
        setLoading(false);
      });
    } else {
      // CORREÇÃO CRUCIAL: Se não houver token, pare de carregar imediatamente.
      // Isso impede que a página fique presa em "Carregando...".
      setLoading(false);
    }
  }, [token]); // O efeito agora depende apenas do token

  if (loading) {
    return <div className="container text-center my-5"><h2>Carregando...</h2></div>;
  }

  return (
    <div className="container my-5">
      <h1 className="mb-4">Minha Conta</h1>
      {/* Adicionamos uma verificação para garantir que 'user' não seja nulo */}
      {user && <p className="lead">Olá, {user.nome}! Bem-vindo(a) de volta.</p>}

      <h2 className="mt-5">Seu Histórico de Pedidos</h2>
      {pedidos.length === 0 ? (
        <p>Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="list-group">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="list-group-item list-group-item-action flex-column align-items-start">
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">Pedido #{pedido.id}</h5>
                <small>Data: {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</small>
              </div>
              <p className="mb-1">Valor Total: R$ {parseFloat(pedido.valor_total).toFixed(2)}</p>
              <small className="text-capitalize">Status: {pedido.status.replace('_', ' ')}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhaContaPage;