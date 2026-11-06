import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StarFill } from 'react-bootstrap-icons';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { API_URL, apiFetch } from '../services/Api';
import { onImgError } from '../utils/imgPlaceholder';

// ─────────────────────────────────────────────────────────────────
// CACHE EM MEMÓRIA PARA A PÁGINA DO PRODUTO (5 minutos)
// ─────────────────────────────────────────────────────────────────
const memoryCache = {};
const TEMPO_CACHE = 5 * 60 * 1000;

const ProdutoDetalhe = () => {
  const [produto, setProduto] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [quantidade, setQuantidade] = useState(1);
  const [novaNota, setNovaNota] = useState(0);
  const [novoComentario, setNovoComentario] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [relacionados, setRelacionados] = useState([]);
  const [varianteSelecionada, setVarianteSelecionada] = useState(null);

  const fetchData = () => {
    // 1. VERIFICAMOS O CACHE!
    const cacheKey = `produto_${id}`;
    const cacheValido = memoryCache[cacheKey] && (Date.now() - memoryCache[cacheKey].timestamp < TEMPO_CACHE);

    if (cacheValido) {
      setProduto(memoryCache[cacheKey].produto);
      setAvaliacoes(memoryCache[cacheKey].avaliacoes);
      setRelacionados(memoryCache[cacheKey].relacionados);

      // Auto-seleciona a variante com estoque, se houver
      if (memoryCache[cacheKey].produto.variantes?.length > 0) {
        const varianteComEstoque = memoryCache[cacheKey].produto.variantes.find(v => v.quantidade_estoque > 0) || memoryCache[cacheKey].produto.variantes[0];
        setVarianteSelecionada(varianteComEstoque);
      }

      setLoading(false);
      setFetchError(false);
      return;
    }

    // 2. SE NÃO TEM CACHE, BUSCA NA API
    setLoading(true);
    setFetchError(false);

    Promise.all([
      apiFetch(`/api/produtos/${id}`),
      apiFetch(`/api/avaliacoes/produto/${id}`),
    ])
      .then(async ([prodRes, avRes]) => {
        if (!prodRes.ok) throw new Error('Produto não encontrado');
        const produtoData = await prodRes.json();
        const avaliacoesData = await avRes.json();

        let relacionadosData = [];
        if (produtoData?.sub_categoria_id) {
          try {
            const relRes = await apiFetch(`/api/produtos/${id}/relacionados`);
            if (relRes.ok) {
              const relJson = await relRes.json();
              relacionadosData = relJson.products || [];
            }
          } catch (e) { console.error('Erro ao buscar relacionados', e); }
        }

        // Aplica os dados nos estados
        setProduto(produtoData);
        setAvaliacoes(avaliacoesData);
        setRelacionados(relacionadosData);

        if (produtoData.variantes && produtoData.variantes.length > 0) {
          const varianteComEstoque = produtoData.variantes.find(v => v.quantidade_estoque > 0) || produtoData.variantes[0];
          setVarianteSelecionada(varianteComEstoque);
        }

        // 3. SALVA NO CACHE
        memoryCache[cacheKey] = {
          produto: produtoData,
          avaliacoes: avaliacoesData,
          relacionados: relacionadosData,
          timestamp: Date.now()
        };
      })
      .catch(() => { setFetchError(true); setProduto(null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (novaNota === 0) return toast.error('Selecione uma nota de 1 a 5 estrelas.');
    if (!isAuthenticated) return toast.error('Você precisa estar logado para avaliar.');

    setReviewLoading(true);
    try {
      const res = await apiFetch('/api/avaliacoes', {
        method: 'POST',
        body: JSON.stringify({ produto_id: id, nota: novaNota, comentario: novoComentario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Não foi possível enviar sua avaliação.');
      toast.success('Obrigado pela sua avaliação!');
      setNovaNota(0);
      setNovoComentario('');

      // Limpa o cache para forçar a busca da nova avaliação
      delete memoryCache[`produto_${id}`];
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (produto.variantes?.length > 0 && !varianteSelecionada) {
      return toast.error('Selecione uma cor ou tamanho antes de comprar.');
    }

    try {
      const produtoParaCarrinho = {
        ...produto,
        varianteSelecionada: varianteSelecionada
      };

      await addToCart(produtoParaCarrinho, quantidade);
      toast.success(`${quantidade}x ${produto.nome} ${varianteSelecionada ? `(${varianteSelecionada.nome_variante})` : ''} no carrinho!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="container text-center my-5">
      <div className="spinner-border" role="status"><span className="visually-hidden">Carregando...</span></div>
    </div>
  );

  if (fetchError || !produto) return (
    <div className="container text-center my-5">
      <h1>Produto não encontrado!</h1>
      <p className="text-muted">O produto pode ter sido removido ou o endereço está incorreto.</p>
      <Link to="/" className="btn btn-dark-custom">Voltar para a Home</Link>
    </div>
  );

  const temOferta = produto.preco_promocional && parseFloat(produto.preco_promocional) > 0;
  const acrescimo = varianteSelecionada ? parseFloat(varianteSelecionada.preco_adicional) : 0;
  const estoqueReal = varianteSelecionada ? varianteSelecionada.quantidade_estoque : produto.quantidade_estoque;

  const precoBaseCalc = parseFloat(produto.preco) + acrescimo;
  const precoPromoCalc = temOferta ? (parseFloat(produto.preco_promocional) + acrescimo) : precoBaseCalc;

  // URL absoluta da imagem para o Open Graph (WhatsApp/Facebook)
  const ogImageUrl = `${API_URL}/images/${produto.url_imagem}`;
  const productUrl = window.location.href;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          SEO: Injeção Dinâmica das Tags Open Graph para este Produto
      ───────────────────────────────────────────────────────────────── */}
      <Helmet>
        <title>{produto.nome} | Meby Cosméticos</title>
        <meta name="description" content={produto.descricao ? produto.descricao.substring(0, 150) + '...' : `Compre ${produto.nome} na Meby Cosméticos.`} />

        {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
        <meta property="og:url" content={productUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${produto.nome} | Meby Cosméticos`} />
        <meta property="og:description" content={produto.descricao ? produto.descricao.substring(0, 150) + '...' : `Compre ${produto.nome} na Meby Cosméticos.`} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:alt" content={produto.nome} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${produto.nome} | Meby Cosméticos`} />
        <meta name="twitter:description" content={produto.descricao ? produto.descricao.substring(0, 150) + '...' : `Compre ${produto.nome} na Meby Cosméticos.`} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      <main className="container my-5">
        <div className="row g-5">
          <div className="col-md-6">
            <img src={ogImageUrl} alt={produto.nome}
              className="img-fluid rounded shadow-sm w-100"
              style={{ objectFit: 'cover', aspectRatio: '1/1' }}
              onError={onImgError} 
              />
          </div>
          <div className="col-md-6 d-flex flex-column justify-content-center">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item active">{produto.nome}</li>
              </ol>
            </nav>
            <h1 className="display-5">{produto.nome}</h1>

            {temOferta ? (
              <div className="mb-2">
                <span className="text-muted text-decoration-line-through me-2 fs-5">
                  R$ {precoBaseCalc.toFixed(2)}
                </span>
                <span className="fs-3 fw-bold" style={{ color: 'var(--meby-rosa-seco)' }}>
                  R$ {precoPromoCalc.toFixed(2)}
                </span>
              </div>
            ) : (
              <p className="fs-3 fw-bold">R$ {precoBaseCalc.toFixed(2)}</p>
            )}

            <p className="lead">{produto.descricao}</p>

            {produto.variantes && produto.variantes.length > 0 && (
              <div className="mb-4">
                <span className="text-muted fw-500 d-block mb-2">Escolha uma opção:</span>
                <div className="d-flex flex-wrap gap-2">
                  {produto.variantes.map(v => (
                    <button
                      key={v.id}
                      className={`btn ${varianteSelecionada?.id === v.id ? 'btn-dark-custom' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        setVarianteSelecionada(v);
                        setQuantidade(1);
                      }}
                      disabled={v.quantidade_estoque <= 0}
                    >
                      {v.nome_variante} {v.quantidade_estoque <= 0 && '(Esgotado)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {estoqueReal > 0 ? (
              <>
                <p className="text-muted mb-3">
                  Em estoque: <strong>{estoqueReal}</strong> unidades
                </p>

                <div className="d-flex align-items-center gap-3 mb-4">
                  <span className="text-muted fw-500">Quantidade:</span>
                  <div className="d-flex align-items-center rounded"
                    style={{ border: '1px solid var(--meby-rosa-claro)', display: 'inline-flex' }}>
                    <button
                      className="btn btn-sm px-3 py-2"
                      style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)', borderRadius: '6px 0 0 6px' }}
                      onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                      disabled={quantidade <= 1}
                    > − </button>
                    <span className="px-4 fw-bold" style={{ minWidth: 48, textAlign: 'center', fontSize: '1.1rem' }}>
                      {quantidade}
                    </span>
                    <button
                      className="btn btn-sm px-3 py-2"
                      style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)', borderRadius: '0 6px 6px 0' }}
                      onClick={() => setQuantidade(q => Math.min(estoqueReal, q + 1))}
                      disabled={quantidade >= estoqueReal}
                    > + </button>
                  </div>
                  {quantidade >= estoqueReal && (
                    <small style={{ color: 'var(--bs-warning)' }}>Máximo disponível</small>
                  )}
                </div>

                <button className="btn btn-dark-custom btn-lg w-100" onClick={handleAddToCart}>
                  Adicionar ao Carrinho
                  {quantidade > 1 && <span className="ms-2 opacity-75">({quantidade} unidades)</span>}
                </button>
              </>
            ) : (
              <>
                <p className="text-muted mb-3">Em estoque: <strong>0</strong> unidades</p>
                <button className="btn btn-dark-custom btn-lg w-100" disabled>Esgotado</button>
              </>
            )}
          </div>
        </div>

        <hr className="my-5" />

        <div className="row g-4">
          <div className="col-md-7">
            <h2 className="mb-4">Avaliações ({avaliacoes.length})</h2>
            {avaliacoes.length === 0 ? (
              <p className="text-muted">Nenhuma avaliação ainda. Seja o primeiro!</p>
            ) : (
              avaliacoes.map(r => (
                <div key={r.id} className="mb-4 border-bottom pb-3">
                  <h5 className="mb-1">{r.cliente_nome}</h5>
                  <div className="d-flex align-items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <StarFill key={i} color={i < r.nota ? '#ffc107' : '#e4e5e9'} className="me-1" />
                    ))}
                  </div>
                  <p>{r.comentario}</p>
                  <small className="text-muted">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</small>
                </div>
              ))
            )}
          </div>

          {isAuthenticated && (
            <div className="col-md-5">
              <h4>Deixe sua avaliação</h4>
              <form onSubmit={handleReviewSubmit} className="card p-4 bg-light">
                <div className="mb-3">
                  <label className="form-label">Sua nota</label>
                  <div className="fs-4">
                    {[...Array(5)].map((_, i) => (
                      <StarFill key={i} color={i < novaNota ? '#ffc107' : '#e4e5e9'}
                        className="me-1" style={{ cursor: 'pointer' }}
                        onClick={() => setNovaNota(i + 1)} />
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Comentário (opcional)</label>
                  <textarea rows="4" className="form-control"
                    value={novoComentario} onChange={e => setNovoComentario(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={reviewLoading}>
                  {reviewLoading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Enviando...</>
                    : 'Enviar Avaliação'
                  }
                </button>
              </form>
            </div>
          )}
        </div>

        {relacionados.length > 0 && (
          <>
            <hr className="my-5" />
            <section>
              <h2 className="mb-4">Você também pode gostar</h2>
              <div className="row g-4">
                {relacionados.map(prod => {
                  const temOfertaRel = prod.preco_promocional && parseFloat(prod.preco_promocional) > 0;
                  return (
                    <div key={prod.id} className="col-6 col-md-3">
                      <a
                        href={`/produto/${prod.id}`}
                        className="card h-100 border-0 product-card text-decoration-none text-dark"
                        onClick={e => { e.preventDefault(); window.location.href = `/produto/${prod.id}`; }}
                      >
                        <img
                          src={`${API_URL}/images/${prod.url_imagem}`}
                          alt={prod.nome}
                          className="card-img-top"
                          style={{ aspectRatio: '1/1', objectFit: 'cover' }}
                          onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300?text=Sem+Imagem'; }}
                        />
                        <div className="card-body d-flex flex-column p-2">
                          <p className="card-title mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {prod.nome}
                          </p>
                          <div className="mt-auto">
                            {temOfertaRel ? (
                              <>
                                <span className="text-muted text-decoration-line-through me-1" style={{ fontSize: '0.8rem' }}>
                                  R$ {parseFloat(prod.preco).toFixed(2)}
                                </span>
                                <span className="fw-bold" style={{ color: 'var(--meby-rosa-seco)', fontSize: '0.95rem' }}>
                                  R$ {parseFloat(prod.preco_promocional).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="fw-bold" style={{ fontSize: '0.95rem' }}>
                                R$ {parseFloat(prod.preco).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button
                            className="btn btn-dark-custom btn-sm w-100 mt-2"
                            disabled={prod.quantidade_estoque === 0}
                            onClick={e => { e.preventDefault(); window.location.href = `/produto/${prod.id}`; }}
                          >
                            Ver Opções
                          </button>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
};

export default ProdutoDetalhe;