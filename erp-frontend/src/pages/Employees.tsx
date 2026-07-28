import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Employee = {
  id: string
  full_name: string
  email: string
  role: 'manager' | 'employee'
  created_at: string
}

export const Employees: React.FC = () => {
  const { role } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'employee',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name')
      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'manager') fetchEmployees()
  }, [role])

  // ---- Edit only (no create) ----
  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      full_name: emp.full_name,
      email: emp.email,
      role: emp.role,
    })
    setShowModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: formData.full_name,
          role: formData.role,
        })
        .eq('id', editingEmployee!.id)
      if (error) throw error
      setSuccess('Employee updated')
      setShowModal(false)
      setEditingEmployee(null)
      fetchEmployees()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this employee?')) return
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSuccess('Employee deleted')
      fetchEmployees()
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
        <h2>Employees</h2>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            To add new employees, create them in Supabase Auth first.
          </span>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.5rem' }}>{emp.full_name}</td>
                  <td style={{ padding: '0.5rem' }}>{emp.email}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: emp.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                      color: emp.role === 'manager' ? '#1e40af' : '#374151',
                    }}>
                      {emp.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(emp)}
                        style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
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

      {/* Edit Modal */}
      {showModal && editingEmployee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h3>Edit Employee</h3>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f3f4f6' }}
                />
                <small style={{ color: '#6b7280' }}>Email cannot be changed</small>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'manager' | 'employee' })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}