import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Esquema de validação com Zod (sem alterações)
const productSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  descricao: z.string().optional(),
  preco: z.coerce.number().positive('O preço deve ser um número positivo.'),
  quantidade_estoque: z.coerce.number().int().nonnegative('O estoque não pode ser negativo.'),
  url_imagem: z.string().optional(),
  sub_categoria_id: z.coerce.number().int().positive('Você deve selecionar uma sub-categoria.')
});

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const isEditing = Boolean(id);

  // States (sem alterações)
  const [categorias, setCategorias] = useState([]);
  const [subCategorias, setSubCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [showNovaSubCategoria, setShowNovaSubCategoria] = useState(false);
  const [novaSubCategoriaNome, setNovaSubCategoriaNome] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
  });

  // useEffects para buscar dados (sem alterações)
  useEffect(() => {
    fetch('http://localhost:3001/api/categorias')
      .then(res => res.json())
      .then(data => setCategorias(data));
  }, []);

  useEffect(() => {
    if (selectedCategoria) {
      fetch(`http://localhost:3001/api/categorias/sub?categoriaId=${selectedCategoria}`)
        .then(res => res.json())
        .then(data => setSubCategorias(data));
    } else {
      setSubCategorias([]);
    }
  }, [selectedCategoria]);

  useEffect(() => {
    if (isEditing) {
      fetch(`http://localhost:3001/api/produtos/${id}`)
        .then(res => res.json())
        .then(data => {
          Object.keys(data).forEach(key => setValue(key, data[key]));
          setExistingImageUrl(data.url_imagem);
        });
    }
  }, [id, isEditing, setValue]);

  // Função para criar sub-categoria (sem alterações)
  const handleCreateSubCategoria = async () => { /* ...seu código existente... */ };

  // Função onSubmit refatorada para a forma mais simples
  const onSubmit = async (formData) => {
    setLoading(true);
    
    try {
      let finalImageFilename = existingImageUrl;

      // 1. Faz o upload da imagem, se houver uma nova
      if (imagemSelecionada) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', imagemSelecionada);
        const uploadRes = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadFormData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || 'Falha no upload da imagem.');
        finalImageFilename = uploadData.imageFilename;
      }

      if (!finalImageFilename && !isEditing) {
        throw new Error("Por favor, selecione uma imagem para o novo produto.");
      }
      
      const productData = { ...formData, url_imagem: finalImageFilename };
      const url = isEditing ? `http://localhost:3001/api/produtos/${id}` : 'http://localhost:3001/api/produtos';
      const method = isEditing ? 'PUT' : 'POST';

      // 2. Envia os dados do produto
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar o produto');
      }

      // 3. Mostra a notificação de sucesso
      toast.success(`Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);

      // 4. Espera 1.5 segundos e DEPOIS navega
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);

    } catch (error) {
      // 5. Mostra a notificação de erro
      toast.error(`Erro: ${error.message}`);
      setLoading(false);
    }
    // Não precisamos do setLoading(false) no 'finally', pois o redirect acontecerá
  };

  return (
    <div className="container my-5" style={{ maxWidth: '800px' }}>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Admin Dashboard</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{isEditing ? `Editando produto` : 'Novo Produto'}</li>
        </ol>
      </nav>
      <h1 className="mb-4">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* --- CAMPO NOME --- */}
        <div className="mb-3">
          <label htmlFor="nome" className="form-label">Nome do Produto</label>
          <input type="text" className={`form-control ${errors.nome ? 'is-invalid' : ''}`} id="nome" {...register('nome')} />
          {errors.nome && <div className="invalid-feedback">{errors.nome.message}</div>}
        </div>
        
        {/* --- CAMPO DESCRIÇÃO --- */}
        <div className="mb-3">
          <label htmlFor="descricao" className="form-label">Descrição</label>
          <textarea className="form-control" id="descricao" rows="4" {...register('descricao')}></textarea>
        </div>
        
        {/* --- CAMPOS PREÇO E ESTOQUE (LADO A LADO) --- */}
        <div className="row">
            <div className="col-md-6 mb-3">
                <label htmlFor="preco" className="form-label">Preço (R$)</label>
                <input type="number" step="0.01" className={`form-control ${errors.preco ? 'is-invalid' : ''}`} id="preco" {...register('preco')} />
                {errors.preco && <div className="invalid-feedback">{errors.preco.message}</div>}
            </div>
            <div className="col-md-6 mb-3">
                <label htmlFor="quantidade_estoque" className="form-label">Quantidade em Estoque</label>
                <input type="number" className={`form-control ${errors.quantidade_estoque ? 'is-invalid' : ''}`} id="quantidade_estoque" {...register('quantidade_estoque')} />
                {errors.quantidade_estoque && <div className="invalid-feedback">{errors.quantidade_estoque.message}</div>}
            </div>
        </div>
        
        {/* --- CAMPO IMAGEM --- */}
        <div className="mb-3">
            <label htmlFor="imagem" className="form-label">Imagem do Produto</label>
            <input 
              type="file" 
              className="form-control" 
              id="imagem"
              accept="image/png, image/jpeg, image/jpg"
              onChange={(e) => setImagemSelecionada(e.target.files[0])}
            />
            {existingImageUrl && !imagemSelecionada && (
                <div className="mt-2">
                    <small className="text-muted d-block">Imagem atual: {existingImageUrl}</small>
                    <img src={`http://localhost:3001/images/${existingImageUrl}`} alt="Preview" className="img-thumbnail mt-1" width="100"/>
                </div>
            )}
            <input type="hidden" {...register('url_imagem')} />
        </div>

        {/* --- SELEÇÃO DE CATEGORIA --- */}
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="categoria_id" className="form-label">Categoria Principal</label>
            <select id="categoria_id" className="form-select" value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)}>
              <option value="">Selecione...</option>
              {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="sub_categoria_id" className="form-label">Sub-Categoria</label>
            <select id="sub_categoria_id" className={`form-select ${errors.sub_categoria_id ? 'is-invalid' : ''}`} {...register('sub_categoria_id')} disabled={!selectedCategoria}>
              <option value="">Selecione...</option>
              {subCategorias.map(sub => <option key={sub.id} value={sub.id}>{sub.nome}</option>)}
            </select>
            {errors.sub_categoria_id && <div className="invalid-feedback">{errors.sub_categoria_id.message}</div>}
          </div>
        </div>

        {selectedCategoria && (
            <div className="mb-4">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowNovaSubCategoria(!showNovaSubCategoria)}>
                    {showNovaSubCategoria ? 'Cancelar' : '+ Criar Nova Sub-Categoria'}
                </button>
                {showNovaSubCategoria && (
                    <div className="input-group mt-2" style={{maxWidth: '400px'}}>
                        <input type="text" className="form-control" placeholder="Nome da nova sub-categoria" value={novaSubCategoriaNome} onChange={(e) => setNovaSubCategoriaNome(e.target.value)} />
                        <button type="button" className="btn btn-success" onClick={handleCreateSubCategoria}>Salvar</button>
                    </div>
                )}
            </div>
        )}

        <hr className="my-4" />

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Produto')}
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;