import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Client = { id: string; name: string }

type Project = {
  id: string
  name: string
  client_id: string | null
  created_at: string
  clients?: { name: string }
}

export const Projects: React.FC = () => {
  const { role } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch projects with client names
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          clients:client_id ( name )
        `)
        .order('name')
      if (projectError) throw projectError
      setProjects(projectData || [])

      // Fetch clients for dropdown
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')
      if (clientError) throw clientError
      setClients(clientData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'manager') fetchData()
  }, [role])

  // ---- Create / Edit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const payload = {
        name: formData.name,
        client_id: formData.client_id || null,
      }

      if (editingItem) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingItem.id)
        if (error) throw error
        setSuccess('Project updated')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([payload])
        if (error) throw error
        setSuccess('Project created')
      }
      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', client_id: '' })
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project?')) return
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSuccess('Project deleted')
      fetchData()
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
        <h2>Projects</h2>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({ name: '', client_id: '' })
            setShowModal(true)
          }}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Add Project
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Client</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No projects found. <br />
                  <small>Tip: Add a client first (via Supabase Table Editor or Clients page later).</small>
                </td>
              </tr>
            ) : (
              projects.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.5rem' }}>{item.name}</td>
                  <td style={{ padding: '0.5rem' }}>{item.clients?.name || '-'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setFormData({
                            name: item.name,
                            client_id: item.client_id || '',
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
            <h3>{editingItem ? 'Edit Project' : 'New Project'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Client</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="">None</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {clients.length === 0 && <small style={{ color: '#6b7280' }}>No clients found. Add a client via Supabase Table Editor.</small>}
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