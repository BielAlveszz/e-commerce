import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Trash, PencilSquare } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

// Componente de formulário para adicionar sub-categorias
const AddSubCategoryForm = ({ categoriaId, onSubCategoryAdded }) => {
    const [nome, setNome] = useState('');
    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nome.trim()) return;

        try {
            const response = await fetch('http://localhost:3001/api/categorias/sub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nome: nome, categoria_id: categoriaId })
            });
            if (!response.ok) throw new Error('Falha ao criar sub-categoria.');
            toast.success('Sub-categoria adicionada!');
            setNome(''); 
            onSubCategoryAdded(); 
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <li className="list-group-item">
            <form onSubmit={handleSubmit} className="input-group">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Nova sub-categoria (ex: Batons)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                />
                <button className="btn btn-sm btn-outline-success" type="submit">Adicionar</button>
            </form>
        </li>
    );
};


const AdminCategoryPage = () => {
    const [categorias, setCategorias] = useState([]);
    const [subCategorias, setSubCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    
    const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
    
    // Estados para o modo de edição
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [editingNome, setEditingNome] = useState('');

    // Função para buscar todos os dados do zero
    const fetchData = async () => {
        try {
            const [catRes, subCatRes] = await Promise.all([
                fetch('http://localhost:3001/api/categorias'),
                fetch('http://localhost:3001/api/categorias/sub')
            ]);
            if (!catRes.ok || !subCatRes.ok) throw new Error('Falha ao buscar dados.');
            const catData = await catRes.json();
            const subCatData = await subCatRes.json();
            setCategorias(catData);
            setSubCategorias(subCatData);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, []);

    // Função para criar uma nova categoria principal
    const handleCreateCategoria = async (e) => {
        e.preventDefault();
        if (!novaCategoriaNome.trim()) return toast.error('O nome da categoria não pode ser vazio.');
        try {
            const response = await fetch('http://localhost:3001/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nome: novaCategoriaNome })
            });
            if (!response.ok) throw new Error('Falha ao criar categoria.');
            toast.success('Categoria principal criada com sucesso!');
            await fetchData(); 
            setNovaCategoriaNome('');
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Função para deletar uma sub-categoria
    const handleDeleteSubCategoria = async (subCatId) => {
        if (window.confirm('Tem certeza? Deletar uma sub-categoria pode afetar produtos existentes.')) {
            try {
                const response = await fetch(`http://localhost:3001/api/categorias/sub/${subCatId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao deletar.');
                toast.success('Sub-categoria deletada.');
                await fetchData();
            } catch (error) {
                toast.error(error.message);
            }
        }
    };
    
    // Função para deletar uma categoria principal
       const handleDeleteCategoria = async (catId) => {
        if (window.confirm('ATENÇÃO! Deletar uma categoria principal também deletará TODAS as suas sub-categorias. Deseja continuar?')) {
            try {
                // A CORREÇÃO ESTÁ AQUI: Adicionamos o cabeçalho 'Authorization'
                const response = await fetch(`http://localhost:3001/api/categorias/${catId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao deletar. Verifique se não há produtos nesta categoria.');
                }
                toast.success('Categoria principal deletada com sucesso!');
                await fetchData();
            } catch (error) {
                toast.error(error.message);
            }
        }
    };
    
    // Função para atualizar o nome de uma categoria principal
    const handleUpdateCategoria = async (e) => {
        e.preventDefault();
        if (!editingNome.trim()) return toast.error('O nome não pode ser vazio.');
        try {
            const response = await fetch(`http://localhost:3001/api/categorias/${editingCategoria}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nome: editingNome })
            });
            if (!response.ok) throw new Error('Falha ao atualizar.');
            toast.success('Categoria atualizada com sucesso!');
            await fetchData();
            setEditingCategoria(null);
            setEditingNome('');
        } catch (error) {
            toast.error(error.message);
        }
    };

    if (loading) return <div className="container my-5">Carregando categorias...</div>;

    return (
        <div className="container my-5">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/admin/dashboard">Admin Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Gerenciar Categorias</li>
                </ol>
            </nav>
            <h1 className="mb-4">Gerenciar Categorias</h1>

            <div className="row g-4">
                <div className="col-lg-5">
                    <div className="card">
                        <div className="card-header">
                            <h5>Criar Nova Categoria Principal</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleCreateCategoria}>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Ex: Skincare, Acessórios..." 
                                        value={novaCategoriaNome}
                                        onChange={(e) => setNovaCategoriaNome(e.target.value)}
                                        required
                                    />
                                    <button className="btn btn-primary" type="submit">Criar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="col-lg-7">
                    <div className="card">
                        <div className="card-header">
                            <h5>Categorias e Sub-Categorias Existentes</h5>
                        </div>
                        <div className="card-body">
                            {categorias.length === 0 && <p className="text-muted">Nenhuma categoria principal criada.</p>}
                            {categorias.map(cat => (
                                <div key={cat.id} className="mb-3">
                                    {editingCategoria === cat.id ? (
                                        <form onSubmit={handleUpdateCategoria} className="d-flex justify-content-between align-items-center mb-2">
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm me-2" 
                                                value={editingNome}
                                                onChange={(e) => setEditingNome(e.target.value)}
                                                autoFocus
                                            />
                                            <div>
                                                <button type="submit" className="btn btn-sm btn-success me-2">Salvar</button>
                                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingCategoria(null)}>Cancelar</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <h6 className="fw-bold d-flex justify-content-between align-items-center">
                                            <span>{cat.nome}</span>
                                            <div>
                                                <button 
                                                    className="btn btn-sm btn-outline-secondary me-2" 
                                                    onClick={() => {
                                                        setEditingCategoria(cat.id);
                                                        setEditingNome(cat.nome);
                                                    }}
                                                >
                                                    <PencilSquare />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteCategoria(cat.id)}>
                                                    <Trash />
                                                </button>
                                            </div>
                                        </h6>
                                    )}
                                    <ul className="list-group">
                                        {subCategorias.filter(sub => sub.categoria_id === cat.id).map(sub => (
                                            <li key={sub.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                {sub.nome}
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSubCategoria(sub.id)}>
                                                    <Trash />
                                                </button>
                                            </li>
                                        ))}
                                        {subCategorias.filter(sub => sub.categoria_id === cat.id).length === 0 && (
                                            <li className="list-group-item text-muted fst-italic">Nenhuma sub-categoria.</li>
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