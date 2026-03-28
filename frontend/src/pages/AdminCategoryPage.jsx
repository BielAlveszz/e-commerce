import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Trash, PencilSquare } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { apiFetch } from '../services/Api';

const AddSubCategoryForm = ({ categoriaId, onSubCategoryAdded }) => {
  const [nome, setNome]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/categorias/sub', {
        method: 'POST',
        body: JSON.stringify({ nome, categoria_id: categoriaId }),
      });
      if (!res.ok) throw new Error('Falha ao criar sub-categoria.');
      toast.success('Sub-categoria adicionada!');
      setNome('');
      onSubCategoryAdded();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="list-group-item">
      <form onSubmit={handleSubmit} className="input-group">
        <input type="text" className="form-control form-control-sm"
          placeholder="Nova sub-categoria..." value={nome} onChange={e => setNome(e.target.value)} />
        <button className="btn btn-sm btn-outline-custom" type="submit" disabled={loading}>
          {loading ? '...' : 'Adicionar'}
        </button>
      </form>
    </li>
  );
};

const AdminCategoryPage = () => {
  const [categorias, setCategorias]         = useState([]);
  const [subCategorias, setSubCategorias]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [editingCategoria, setEditingCategoria]   = useState(null);
  const [editingNome, setEditingNome]             = useState('');

  const fetchData = async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        apiFetch('/api/categorias'),
        apiFetch('/api/categorias/sub'),
      ]);
      if (!catRes.ok || !subRes.ok) throw new Error('Falha ao buscar dados.');
      setCategorias(await catRes.json());
      setSubCategorias(await subRes.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); fetchData(); }, []);

  const handleCreateCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return toast.error('O nome não pode ser vazio.');
    try {
      const res = await apiFetch('/api/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: novaCategoriaNome }),
      });
      if (!res.ok) throw new Error('Falha ao criar categoria.');
      toast.success('Categoria criada!');
      setNovaCategoriaNome('');
      await fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateCategoria = async (e) => {
    e.preventDefault();
    if (!editingNome.trim()) return toast.error('O nome não pode ser vazio.');
    try {
      const res = await apiFetch(`/api/categorias/${editingCategoria}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editingNome }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar.');
      toast.success('Categoria atualizada!');
      setEditingCategoria(null);
      setEditingNome('');
      await fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategoria = async (catId) => {
    if (!window.confirm('Deletar esta categoria também remove todas as suas sub-categorias. Confirma?')) return;
    try {
      const res = await apiFetch(`/api/categorias/${catId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao deletar.');
      }
      toast.success('Categoria deletada!');
      await fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSubCategoria = async (subId) => {
    if (!window.confirm('Deletar esta sub-categoria pode afetar produtos. Confirma?')) return;
    try {
      const res = await apiFetch(`/api/categorias/sub/${subId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao deletar.');
      toast.success('Sub-categoria deletada.');
      await fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="container my-5 text-center">
      <div className="spinner-border" role="status"><span className="visually-hidden">Carregando...</span></div>
    </div>
  );

  return (
    <div className="container my-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item active">Categorias</li>
        </ol>
      </nav>
      <h1 className="mb-4">Gerenciar Categorias</h1>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Nova Categoria Principal</h5></div>
            <div className="card-body">
              <form onSubmit={handleCreateCategoria}>
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Ex: Skincare, Acessórios..."
                    value={novaCategoriaNome} onChange={e => setNovaCategoriaNome(e.target.value)} required />
                  <button className="btn btn-dark-custom" type="submit">Criar</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Categorias Existentes</h5></div>
            <div className="card-body">
              {categorias.length === 0 && <p className="text-muted">Nenhuma categoria criada ainda.</p>}
              {categorias.map(cat => (
                <div key={cat.id} className="mb-4">
                  {editingCategoria === cat.id ? (
                    <form onSubmit={handleUpdateCategoria} className="d-flex gap-2 mb-2">
                      <input type="text" className="form-control form-control-sm"
                        value={editingNome} onChange={e => setEditingNome(e.target.value)} autoFocus />
                      <button type="submit" className="btn btn-sm btn-dark-custom">Salvar</button>
                      <button type="button" className="btn btn-sm btn-secondary"
                        onClick={() => setEditingCategoria(null)}>Cancelar</button>
                    </form>
                  ) : (
                    <h6 className="fw-bold d-flex justify-content-between align-items-center">
                      <span>{cat.nome}</span>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-secondary"
                          onClick={() => { setEditingCategoria(cat.id); setEditingNome(cat.nome); }}>
                          <PencilSquare />
                        </button>
                        <button className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteCategoria(cat.id)}>
                          <Trash />
                        </button>
                      </div>
                    </h6>
                  )}
                  <ul className="list-group">
                    {subCategorias.filter(s => s.categoria_id === cat.id).map(sub => (
                      <li key={sub.id} className="list-group-item d-flex justify-content-between align-items-center">
                        {sub.nome}
                        <button className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteSubCategoria(sub.id)}>
                          <Trash />
                        </button>
                      </li>
                    ))}
                    {subCategorias.filter(s => s.categoria_id === cat.id).length === 0 && (
                      <li className="list-group-item text-muted fst-italic small">Nenhuma sub-categoria.</li>
                    )}
                    <AddSubCategoryForm categoriaId={cat.id} onSubCategoryAdded={fetchData} />
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryPage;