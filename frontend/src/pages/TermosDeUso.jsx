import React from 'react';

const TermosDeUso = () => {
  return (
    <main className="container my-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Termos de Uso</h1>
      <p className="text-muted">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h4>1. Aceitação dos Termos</h4>
      <p>Ao acessar e utilizar o site da Meby Cosméticos, você concorda em cumprir estes Termos de Uso. Se você não concorda com alguma parte destes termos, não deve utilizar nossos serviços.</p>

      <h4>2. Cadastro e Segurança</h4>
      <p>Para realizar compras, você precisará criar uma conta. É sua responsabilidade manter a confidencialidade de sua senha e dos dados de acesso.</p>

      <h4>3. Produtos e Preços</h4>
      <p>A Meby Cosméticos reserva-se o direito de alterar os preços dos produtos a qualquer momento sem aviso prévio. As imagens dos produtos são meramente ilustrativas.</p>

      <h4>4. Entregas e Prazos</h4>
      <p>Os prazos de entrega variam conforme a região e a modalidade de envio escolhida. O prazo começa a contar a partir da confirmação do pagamento.</p>
    </main>
  );
};

export default TermosDeUso;