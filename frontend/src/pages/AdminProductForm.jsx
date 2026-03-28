import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch, API_URL } from '../services/Api';

const productSchema = z.object({
  nome:               z.string().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
  descricao:          z.string().optional(),
  preco:              z.coerce.number().positive('Preço deve ser positivo.'),
  preco_promocional:  z.coerce.number().nonnegative('Use 0 para sem oferta.').optional(),
  quantidade_estoque: z.coerce.number().int().nonnegative('Estoque não pode ser negativo.'),
  url_imagem:         z.string().optional(),
  sub_categoria_id:   z.coerce.number().int().positive('Selecione uma sub-categoria.'),
});

const AdminProductForm = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEditing    = Boolean(id);

  const [categorias, setCategorias]               = useState([]);
  const [subCategorias, setSubCategorias]         = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [showNovaSub, setShowNovaSub]             = useState(false);
  const [novaSubNome, setNovaSubNome]             = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [existingImageUrl, setExistingImageUrl]   = useState('');
  const [initialSubCategoryId, setInitialSubCategoryId] = useState(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
  });

  const fetchCategorias = () =>
    apiFetch('/api/categorias').then(r => r.json()).then(setCategorias);

  const fetchSubCategorias = (catId) => {
    if (!catId) return setSubCategorias([]);
    apiFetch(`/api/categorias/sub?categoriaId=${catId}`)
      .then(r => r.json()).then(setSubCategorias);
  };

  useEffect(() => { fetchCategorias(); }, []);
  useEffect(() => { fetchSubCategorias(selectedCategoria); }, [selectedCategoria]);

  useEffect(() => {
    if (!isEditing) return;
    apiFetch(`/api/produtos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data) return;
        Object.keys(data).forEach(key => setValue(key, data[key]));
        setExistingImageUrl(data.url_imagem);
        setInitialSubCategoryId(data.sub_categoria_id);
        setSelectedCategoria(data.categoria_id);
      });
  }, [id, isEditing, setValue]);

  useEffect(() => {
    if (initialSubCategoryId && subCategorias.length > 0) {
      setValue('sub_categoria_id', initialSubCategoryId);
    }
  }, [subCategorias, initialSubCategoryId, setValue]);

  const handleCreateSubCategoria = async () => {
    if (!novaSubNome.trim() || !selectedCategoria) {
      return toast.error('Selecione uma categoria e informe o nome.');
    }
    try {
      const res = await apiFetch('/api/categorias/sub', {
        method: 'POST',
        body: JSON.stringify({ nome: novaSubNome, categoria_id: selectedCategoria }),
      });
      if (!res.ok) throw new Error('Falha ao criar sub-categoria.');
      toast.success('Sub-categoria criada!');
      setNovaSubNome('');
      setShowNovaSub(false);
      fetchSubCategorias(selectedCategoria);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      let finalImageFilename = existingImageUrl;

      if (imagemSelecionada) {
        const uploadData = new FormData();
        uploadData.append('image', imagemSelecionada);
        const uploadRes = await apiFetch('/api/upload', {
          method: 'POST',
          headers: {}, // deixa o browser definir o Content-Type com boundary do FormData
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.message || 'Falha no upload.');
        finalImageFilename = uploadJson.imageFilename;
      }

      if (!finalImageFilename && !isEditing) {
        throw new Error('Selecione uma imagem para o produto.');
      }

      const url    = isEditing ? `/api/produtos/${id}` : '/api/produtos';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...formData, url_imagem: finalImageFilename }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Falha ao salvar produto.');
      }

      toast.success(`Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      setTimeout(() => navigate('/admin/dashboard'), 1500);
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: '800px' }}>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item active">{isEditing ? 'Editar Produto' : 'Novo Produto'}</li>
        </ol>
      </nav>
      <h1 className="mb-4">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-3">
          <label className="form-label">Nome do Produto</label>
          <input type="text" className={`form-control ${errors.nome ? 'is-invalid' : ''}`} {...register('nome')} />
          {errors.nome && <div className="invalid-feedback">{errors.nome.message}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Descrição</label>
          <textarea className="form-control" rows="4" {...register('descricao')} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Preço Original (R$)</label>
            <input type="number" step="0.01"
              className={`form-control ${errors.preco ? 'is-invalid' : ''}`} {...register('preco')} />
            {errors.preco && <div className="invalid-feedback">{errors.preco.message}</div>}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Preço Promocional (R$)</label>
            <input type="number" step="0.01" placeholder="0 = sem oferta"
              className={`form-control ${errors.preco_promocional ? 'is-invalid' : ''}`}
              {...register('preco_promocional')} />
            {errors.preco_promocional && <div className="invalid-feedback">{errors.preco_promocional.message}</div>}
          </div>
        </div>

        <div className="mb-3" style={{ maxWidth: '300px' }}>
          <label className="form-label">Quantidade em Estoque</label>
          <input type="number"
            className={`form-control ${errors.quantidade_estoque ? 'is-invalid' : ''}`}
            {...register('quantidade_estoque')} />
          {errors.quantidade_estoque && <div className="invalid-feedback">{errors.quantidade_estoque.message}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Imagem do Produto</label>
          <input type="file" className="form-control" accept="image/png,image/jpeg,image/webp"
            onChange={e => setImagemSelecionada(e.target.files[0])} />
          {existingImageUrl && !imagemSelecionada && (
            <div className="mt-2">
              <small className="text-muted d-block">Imagem atual: {existingImageUrl}</small>
              <img src={`${API_URL}/images/${existingImageUrl}`} alt="Preview"
                className="img-thumbnail mt-1" width="100" />
            </div>
          )}
          <input type="hidden" {...register('url_imagem')} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Categoria Principal</label>
            <select className="form-select" value={selectedCategoria}
              onChange={e => setSelectedCategoria(e.target.value)}>
              <option value="">Selecione...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Sub-Categoria</label>
            <select className={`form-select ${errors.sub_categoria_id ? 'is-invalid' : ''}`}
              {...register('sub_categoria_id')} disabled={!selectedCategoria}>
              <option value="">Selecione...</option>
              {subCategorias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {errors.sub_categoria_id && <div className="invalid-feedback">{errors.sub_categoria_id.message}</div>}
          </div>
        </div>

        {selectedCategoria && (
          <div className="mb-4">
            <button type="button" className="btn btn-sm btn-outline-custom"
              onClick={() => setShowNovaSub(p => !p)}>
              {showNovaSub ? 'Cancelar' : '+ Nova Sub-Categoria'}
            </button>
            {showNovaSub && (
              <div className="input-group mt-2" style={{ maxWidth: '400px' }}>
                <input type="text" className="form-control" placeholder="Nome da sub-categoria"
                  value={novaSubNome} onChange={e => setNovaSubNome(e.target.value)} />
                <button type="button" className="btn btn-dark-custom" onClick={handleCreateSubCategoria}>
                  Salvar
                </button>
              </div>
            )}
          </div>
        )}

        <hr className="my-4" />
        <button type="submit" className="btn btn-dark-custom btn-lg" disabled={loading}>
          {loading
            ? <><span className="spinner-border spinner-border-sm me-2"></span>Salvando...</>
            : (isEditing ? 'Salvar Alterações' : 'Criar Produto')
          }
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;