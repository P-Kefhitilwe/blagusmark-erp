import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Client = {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export const Clients: React.FC = () => {
  const { role } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      if (error) throw error
      setClients(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'manager') fetchClients()
  }, [role])

  // ---- Create / Edit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const payload = {
        name: formData.name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
      }

      if (editingItem) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingItem.id)
        if (error) throw error
        setSuccess('Client updated')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([payload])
        if (error) throw error
        setSuccess('Client created')
      }
      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', contact_email: '', contact_phone: '' })
      fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this client? This will also delete all associated projects.')) return
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSuccess('Client deleted')
      fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (role !== 'manager') {
    return <div className="login-container">You don't have permission to view this page.</div>
  }

  if (loading) return <div className="login-container">Loading...</div>

  return (
    <div className="login-container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Clients</h2>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({ name: '', contact_email: '', contact_phone: '' })
            setShowModal(true)
          }}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Add Client
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.5rem' }}>{item.name}</td>
                  <td style={{ padding: '0.5rem' }}>{item.contact_email || '-'}</td>
                  <td style={{ padding: '0.5rem' }}>{item.contact_phone || '-'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setFormData({
                            name: item.name,
                            contact_email: item.contact_email || '',
                            contact_phone: item.contact_phone || '',
                          })
                          setShowModal(true)
                        }}
                        style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h3>{editingItem ? 'Edit Client' : 'New Client'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Contact Phone</label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}