import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MinhaContaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    // Como o ProtectedRoute nos garante que o token existe, podemos buscar diretamente.
    fetch('http://localhost:3001/api/pedidos/meus-pedidos', {
      headers: {
        'Authorization': `Bearer ${token}` 
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao buscar os pedidos.');
      return res.json();
    })
    .then(data => {
      setPedidos(data);
    })
    .catch(error => {
      console.error("Erro ao buscar pedidos:", error);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [token]); // Depender do token ainda é uma boa prática.

  if (loading) {
    return <div className="container text-center my-5"><h2>Carregando seu histórico...</h2></div>;
  }

  return (
    <div className="container my-5">
      <h1 className="mb-4">Minha Conta</h1>
      {/* A verificação 'user &&' garante que o nome só é exibido quando o objeto user está pronto */}
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