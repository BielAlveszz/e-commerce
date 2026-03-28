import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash, ToggleOn, ToggleOff } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { apiFetch } from '../services/Api';

const AdminCuponsPage = () => {
  const [cupons, setCupons]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({
    codigo: '', tipo: 'percentual', valor: '',
    valor_minimo: '', usos_maximos: '', expira_em: '',
  });

  const fetchCupons = async () => {
    try {
      const res  = await apiFetch('/api/cupons');
      const data = await res.json();
      if (res.ok) setCupons(data);
    } catch { toast.error('Erro ao carregar cupons.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await apiFetch('/api/cupons', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          valor:        parseFloat(form.valor),
          valor_minimo: parseFloat(form.valor_minimo) || 0,
          usos_maximos: form.usos_maximos ? parseInt(form.usos_maximos) : null,
          expira_em:    form.expira_em || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Cupom ${data.codigo} criado!`);
      setForm({ codigo: '', tipo: 'percentual', valor: '', valor_minimo: '', usos_maximos: '', expira_em: '' });
      setShowForm(false);
      fetchCupons();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, ativo) => {
    try {
      const res = await apiFetch(`/api/cupons/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setCupons(prev => prev.map(c => c.id === id ? { ...c, ativo: !ativo } : c));
      toast.success(ativo ? 'Cupom desativado.' : 'Cupom ativado.');
    } catch { toast.error('Erro ao atualizar cupom.'); }
  };

  const handleDelete = async (id, codigo) => {
    if (!window.confirm(`Deletar o cupom "${codigo}"?`)) return;
    try {
      const res = await apiFetch(`/api/cupons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCupons(prev => prev.filter(c => c.id !== id));
      toast.success('Cupom deletado.');
    } catch { toast.error('Erro ao deletar cupom.'); }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="container my-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item active">Cupons</li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="mb-0">Cupons de Desconto</h1>
        <button className="btn btn-dark-custom" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancelar' : '+ Novo Cupom'}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h5 className="mb-0">Novo Cupom</h5></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Código *</label>
                  <input type="text" className="form-control text-uppercase"
                    placeholder="Ex: BEMVINDA10" required
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Tipo *</label>
                  <select className="form-select" value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Fixo (R$)</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">
                    Valor * {form.tipo === 'percentual' ? '(%)' : '(R$)'}
                  </label>
                  <input type="number" className="form-control" required min="0.01"
                    max={form.tipo === 'percentual' ? 100 : undefined} step="0.01"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Pedido mínimo (R$)</label>
                  <input type="number" className="form-control" min="0" step="0.01"
                    placeholder="0 = sem mínimo" value={form.valor_minimo}
                    onChange={e => setForm(f => ({ ...f, valor_minimo: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Usos máximos</label>
                  <input type="number" className="form-control" min="1"
                    placeholder="Vazio = ilimitado" value={form.usos_maximos}
                    onChange={e => setForm(f => ({ ...f, usos_maximos: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Expira em</label>
                  <input type="datetime-local" className="form-control" value={form.expira_em}
                    onChange={e => setForm(f => ({ ...f, expira_em: e.target.value }))} />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-dark-custom" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2" />Salvando...</> : 'Criar Cupom'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de cupons */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" role="status" /></div>
      ) : cupons.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>Nenhum cupom criado ainda.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">Código</th>
                    <th>Desconto</th>
                    <th className="d-none d-md-table-cell">Mínimo</th>
                    <th className="d-none d-sm-table-cell">Usos</th>
                    <th className="d-none d-md-table-cell">Expira</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cupons.map(c => (
                    <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.5 }}>
                      <td className="ps-3 fw-bold font-monospace">{c.codigo}</td>
                      <td>
                        {c.tipo === 'percentual'
                          ? `${parseFloat(c.valor)}% off`
                          : `${fmt(c.valor)} off`}
                      </td>
                      <td className="d-none d-md-table-cell text-muted">
                        {parseFloat(c.valor_minimo) > 0 ? fmt(c.valor_minimo) : '—'}
                      </td>
                      <td className="d-none d-sm-table-cell text-muted">
                        {c.usos_atuais}/{c.usos_maximos ?? '∞'}
                      </td>
                      <td className="d-none d-md-table-cell text-muted" style={{ fontSize: '0.85rem' }}>
                        {c.expira_em
                          ? new Date(c.expira_em).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge ${c.ativo ? 'bg-success' : 'bg-secondary'}`}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary"
                            title={c.ativo ? 'Desativar' : 'Ativar'}
                            onClick={() => handleToggle(c.id, c.ativo)}>
                            {c.ativo ? <ToggleOn size={18} /> : <ToggleOff size={18} />}
                          </button>
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(c.id, c.codigo)}>
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCuponsPage;