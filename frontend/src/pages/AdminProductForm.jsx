import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Esquema de validação com Zod
const productSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  descricao: z.string().optional(),
  preco: z.coerce.number().positive('O preço deve ser um número positivo.'),
  quantidade_estoque: z.coerce.number().int().nonnegative('O estoque não pode ser negativo.'),
  // A URL da imagem é opcional no formulário inicial, pois pode vir do upload
  url_imagem: z.string().optional(), 
  sub_categoria_id: z.coerce.number().int().positive('Você deve selecionar uma sub-categoria.')
});

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const isEditing = Boolean(id);

  // Estados para gerenciar a UI
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

  // Busca as categorias e sub-categorias da API
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

  // Preenche o formulário ao editar um produto
  useEffect(() => {
    if (isEditing) {
      fetch(`http://localhost:3001/api/produtos/${id}`)
        .then(res => res.json())
        .then(data => {
          setValue('nome', data.nome);
          setValue('descricao', data.descricao);
          setValue('preco', data.preco);
          setValue('quantidade_estoque', data.quantidade_estoque);
          setValue('url_imagem', data.url_imagem); // Guarda o nome do arquivo atual
          setExistingImageUrl(data.url_imagem); // Guarda para exibição
          setValue('sub_categoria_id', data.sub_categoria_id);
        });
    }
  }, [id, isEditing, setValue]);

  const handleCreateSubCategoria = async () => { /* ...código anterior sem alterações... */ };

  // Função executada ao submeter o formulário
  const onSubmit = async (formData) => {
    setLoading(true);
    let finalImageFilename = existingImageUrl; // Começa com a imagem que já existe

    // 1. Se uma nova imagem foi selecionada, faz o upload dela primeiro
    if (imagemSelecionada) {
      const uploadFormData = new FormData();
      uploadFormData.append('image', imagemSelecionada);

      try {
        const uploadRes = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadFormData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || 'Falha no upload da imagem.');
        
        finalImageFilename = uploadData.imageFilename; // Atualiza com o nome do novo arquivo
      
      } catch (error) {
        setLoading(false);
        return alert(`Erro no upload: ${error.message}`);
      }
    }

    if (!finalImageFilename) {
        setLoading(false);
        return alert("Por favor, selecione uma imagem para o produto.");
    }
    
    // 2. Monta os dados finais do produto com o nome correto da imagem
    const productData = { ...formData, url_imagem: finalImageFilename };

    const url = isEditing ? `http://localhost:3001/api/produtos/${id}` : 'http://localhost:3001/api/produtos';
    const method = isEditing ? 'PUT' : 'POST';

    // 3. Envia os dados do produto para o backend
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productData)
      });
      if (!response.ok) throw new Error('Falha ao salvar o produto');
      
      alert(`Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      navigate('/admin/dashboard');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: '800px' }}>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Admin Dashboard</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{isEditing ? 'Editar Produto' : 'Novo Produto'}</li>
        </ol>
      </nav>
      <h1 className="mb-4">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-3">
          <label htmlFor="nome" className="form-label">Nome do Produto</label>
          <input type="text" className={`form-control ${errors.nome ? 'is-invalid' : ''}`} id="nome" {...register('nome')} />
          {errors.nome && <div className="invalid-feedback">{errors.nome.message}</div>}
        </div>
        
        <div className="mb-3">
          <label htmlFor="descricao" className="form-label">Descrição</label>
          <textarea className="form-control" id="descricao" rows="4" {...register('descricao')}></textarea>
        </div>
        
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
        
        <div className="mb-3">
            <label htmlFor="imagem" className="form-label">Imagem do Produto</label>
            <input 
              type="file" 
              className="form-control" 
              id="imagem"
              onChange={(e) => setImagemSelecionada(e.target.files[0])}
            />
            {existingImageUrl && !imagemSelecionada && (
                <div className="mt-2">
                    <small className="text-muted">Imagem atual: {existingImageUrl}</small>
                    <img src={`http://localhost:3001/images/${existingImageUrl}`} alt="Preview" className="img-thumbnail mt-1" width="100"/>
                </div>
            )}
            <input type="hidden" {...register('url_imagem')} />
        </div>

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

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Produto')}
        </button>
      </form>
    </div>
  );
};

export default AdminProductForm;