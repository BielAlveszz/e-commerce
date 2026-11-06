import React from 'react';

const PoliticaPrivacidade = () => {
  return (
    <main className="container my-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Política de Privacidade (LGPD)</h1>
      <p className="text-muted">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h4>1. Coleta de Dados</h4>
      <p>Coletamos informações pessoais como nome, e-mail, CPF, telefone e endereço exclusivamente com a finalidade de processar seus pedidos, emitir notas fiscais e garantir a entrega dos cosméticos.</p>

      <h4>2. Proteção e Segurança</h4>
      <p>A Meby Cosméticos adota medidas de segurança robustas. Seus dados sensíveis, como o CPF, são criptografados em nosso banco de dados (AES-256) para garantir máxima proteção contra vazamentos.</p>

      <h4>3. Compartilhamento de Dados</h4>
      <p>Não vendemos ou comercializamos seus dados pessoais. Eles são compartilhados apenas com parceiros estritamente necessários para a operação (como transportadoras e processadores de pagamento como o Mercado Pago).</p>

      <h4>4. Seus Direitos</h4>
      <p>Em conformidade com a LGPD, você tem o direito de solicitar a exclusão da sua conta e anonimização dos seus dados a qualquer momento, entrando em contato através do nosso suporte.</p>
    </main>
  );
};

export default PoliticaPrivacidade;