import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PencilSquare, Trash, Search, DashLg, PlusLg } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { apiFetch, API_URL } from '../services/Api';

// Campo inline de ajuste rápido de estoque
const EstoqueEditor = ({ product, onUpdated }) => {
  const [editando, setEditando]   = useState(false);
  const [valor, setValor]         = useState(product.quantidade_estoque);
  const [loading, setLoading]     = useState(false);

  const salvar = async (novoValor) => {
    if (novoValor < 0) return;
    if (novoValor === product.quantidade_estoque) { setEditando(false); return; }
    setLoading(true);
    try {
      const res  = await apiFetch(`/api/produtos/${product.id}/estoque`, {
        method: 'PATCH',
        body: JSON.stringify({ quantidade: novoValor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Estoque de "${product.nome}" atualizado para ${novoValor}`);
      onUpdated(product.id, novoValor);
      setEditando(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  salvar(valor);
    if (e.key === 'Escape') { setValor(product.quantidade_estoque); setEditando(false); }
  };

  if (editando) {
    return (
      <div className="d-flex align-items-center gap-1" style={{ minWidth: 120 }}>
        <button className="btn btn-sm btn-outline-secondary p-1"
          disabled={loading || valor <= 0}
          onClick={() => setValor(v => Math.max(0, v - 1))}>
          <DashLg size={12} />
        </button>
        <input
          type="number"
          className="form-control form-control-sm text-center p-1"
          style={{ width: 56 }}
          value={valor}
          min={0}
          autoFocus
          onChange={e => setValor(Math.max(0, parseInt(e.target.value) || 0))}
          onKeyDown={handleKeyDown}
          onBlur={() => salvar(valor)}
        />
        <button className="btn btn-sm btn-outline-secondary p-1"
          disabled={loading}
          onClick={() => setValor(v => v + 1)}>
          <PlusLg size={12} />
        </button>
        {loading && <span className="spinner-border spinner-border-sm ms-1" />}
      </div>
    );
  }

  return (
    <button
      className="btn btn-sm btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
      style={{
        color: product.quantidade_estoque === 0
          ? 'var(--bs-danger)'
          : product.quantidade_estoque <= 3
          ? 'var(--bs-warning)'
          : 'var(--meby-texto-escuro)',
        fontWeight: 500,
      }}
      onClick={() => { setValor(product.quantidade_estoque); setEditando(true); }}
      title="Clique para editar o estoque"
    >
      {product.quantidade_estoque === 0 ? '⚠ Esgotado' : `${product.quantidade_estoque} un`}
      <span className="text-muted" style={{ fontSize: '0.7rem' }}>✎</span>
    </button>
  );
};

const AdminProductsPage = () => {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  const fetchProducts = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: p, limit: 12 });
      if (s.trim()) params.append('search', s.trim());
      const res  = await apiFetch(`/api/produtos?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.currentPage || 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(1, search); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1, search);
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deletar "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/produtos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao deletar produto.');
      toast.success(`"${nome}" deletado.`);
      const newPage = products.length === 1 && page > 1 ? page - 1 : page;
      fetchProducts(newPage, search);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Atualiza o estoque localmente sem recarregar a página inteira
  const handleEstoqueUpdated = (productId, novaQtd) => {
    setProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, quantidade_estoque: novaQtd } : p)
    );
  };

  return (
    <div className="container my-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="mb-0">Gerenciar Produtos</h1>
        <Link to="/admin/produtos/novo" className="btn btn-dark-custom">+ Novo Produto</Link>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="mb-4" style={{ maxWidth: 480 }}>
        <div className="input-group">
          <span className="input-group-text"><Search size={16} /></span>
          <input type="text" className="form-control" placeholder="Buscar por nome..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-dark-custom">Buscar</button>
          {search && (
            <button type="button" className="btn btn-outline-secondary"
              onClick={() => { setSearch(''); fetchProducts(1, ''); }}>
              Limpar
            </button>
          )}
        </div>
      </form>

      {/* Legenda do estoque */}
      <div className="d-flex gap-3 mb-4 flex-wrap" style={{ fontSize: '0.8rem' }}>
        <span className="text-muted">Estoque:</span>
        <span style={{ color: 'var(--bs-danger)' }}>⚠ Esgotado = 0</span>
        <span style={{ color: 'var(--bs-warning)' }}>● Baixo = 1–3</span>
        <span style={{ color: 'var(--meby-texto-escuro)' }}>● Normal = 4+</span>
        <span className="text-muted">Clique no estoque para editar diretamente</span>
      </div>

      {error && (
        <div className="alert alert-danger">
          Não foi possível carregar os produtos.
          <button className="btn btn-sm btn-outline-danger ms-2"
            onClick={() => fetchProducts(page, search)}>Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p className="fs-5">Nenhum produto encontrado.</p>
          {search && (
            <button className="btn btn-outline-custom"
              onClick={() => { setSearch(''); fetchProducts(1, ''); }}>
              Ver todos os produtos
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="row g-3">
            {products.map(product => (
              <div key={product.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <div className="card h-100 product-card">
                  <img
                    src={`${API_URL}/images/${product.url_imagem}`}
                    alt={product.nome}
                    className="card-img-top"
                    style={{ aspectRatio: '1/1', objectFit: 'cover' }}
                    onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300?text=Sem+Imagem'; }}
                  />
                  <div className="card-body d-flex flex-column gap-2">
                    <h6 className="card-title mb-0" style={{ fontSize: '0.875rem' }}>
                      {product.nome}
                    </h6>

                    {/* Preço */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {product.preco_promocional && parseFloat(product.preco_promocional) > 0 ? (
                        <>
                          <span className="text-muted text-decoration-line-through small">
                            R$ {parseFloat(product.preco).toFixed(2)}
                          </span>
                          <span className="fw-bold" style={{ color: 'var(--meby-rosa-seco)' }}>
                            R$ {parseFloat(product.preco_promocional).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="fw-bold">R$ {parseFloat(product.preco).toFixed(2)}</span>
                      )}
                    </div>

                    {/* Estoque editável inline */}
                    <EstoqueEditor product={product} onUpdated={handleEstoqueUpdated} />

                    {/* Ações */}
                    <div className="d-flex gap-1 mt-auto pt-1"
                      style={{ borderTop: '1px solid var(--meby-rosa-claro)' }}>
                      <Link to={`/admin/produtos/editar/${product.id}`}
                        className="btn btn-sm btn-outline-custom flex-grow-1" title="Editar produto">
                        <PencilSquare size={14} className="me-1" /> Editar
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Deletar produto"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product.id, product.nome)}
                      >
                        {deletingId === product.id
                          ? <span className="spinner-border spinner-border-sm" />
                          : <Trash size={14} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
              <button className="btn btn-outline-custom btn-sm"
                disabled={page <= 1} onClick={() => fetchProducts(page - 1, search)}>
                ← Anterior
              </button>
              <span className="text-muted small px-2">Página {page} de {totalPages}</span>
              <button className="btn btn-outline-custom btn-sm"
                disabled={page >= totalPages} onClick={() => fetchProducts(page + 1, search)}>
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminProductsPage;