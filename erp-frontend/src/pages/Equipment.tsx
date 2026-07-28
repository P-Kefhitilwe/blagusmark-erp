import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Equipment = {
  id: string
  name: string
  status: 'available' | 'checked_out'
  created_at: string
}

export const Equipment: React.FC = () => {
  const { role } = useAuth()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    status: 'available' as 'available' | 'checked_out',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name')
      if (error) throw error
      setEquipment(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'manager') fetchEquipment()
  }, [role])

  // ---- Create / Edit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('equipment')
          .update({
            name: formData.name,
            status: formData.status,
          })
          .eq('id', editingItem.id)
        if (error) throw error
        setSuccess('Equipment updated')
      } else {
        const { error } = await supabase
          .from('equipment')
          .insert([{
            name: formData.name,
            status: formData.status,
          }])
        if (error) throw error
        setSuccess('Equipment created')
      }
      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', status: 'available' })
      fetchEquipment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this equipment?')) return
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSuccess('Equipment deleted')
      fetchEquipment()
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
        <h2>Equipment</h2>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({ name: '', status: 'available' })
            setShowModal(true)
          }}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Add Equipment
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No equipment found
                </td>
              </tr>
            ) : (
              equipment.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.5rem' }}>{item.name}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: item.status === 'available' ? '#d1fae5' : '#fee2e2',
                      color: item.status === 'available' ? '#065f46' : '#991b1b',
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setFormData({
                            name: item.name,
                            status: item.status,
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h3>{editingItem ? 'Edit Equipment' : 'New Equipment'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'available' | 'checked_out' })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="available">Available</option>
                  <option value="checked_out">Checked Out</option>
                </select>
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