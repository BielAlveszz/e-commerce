import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MinhaContaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth(); // Pega o token e os dados do usuário do contexto

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3001/api/pedidos/meus-pedidos', {
        headers: {
          // É assim que enviamos o token para rotas protegidas
          'Authorization': `Bearer ${token}` 
        }
      })
      .then(res => res.json())
      .then(data => {
        setPedidos(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar pedidos:", error);
        setLoading(false);
      });
    }
  }, [token]); // Roda a busca sempre que o token mudar

  if (loading) {
    return <div className="container text-center my-5"><h2>Carregando histórico...</h2></div>;
  }

  return (
    <div className="container my-5">
      <h1 className="mb-4">Minha Conta</h1>
      <p className="lead">Olá, {user?.nome}! Bem-vindo(a) de volta.</p>

      <h2 className="mt-5">Seu Histórico de Pedidos</h2>
      {pedidos.length === 0 ? (
        <p>Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="list-group">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="list-group-item list-group-item-action flex-column align-items-start">
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">Pedido #{pedido.id}</h5>
                <small>Data: {new Date(pedido.criado_em).toLocaleDateString()}</small>
              </div>
              <p className="mb-1">Valor Total: R$ {parseFloat(pedido.valor_total).toFixed(2)}</p>
              <small>Status: {pedido.status.replace('_', ' ')}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhaContaPage;