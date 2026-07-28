import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type WorkOrder = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'completed'
  project_id: string | null
  assigned_to: string | null
  completed_at: string | null
  created_at: string
  project?: { name: string }
  employee?: { full_name: string }
}

type Employee = { id: string; full_name: string }
type Project = { id: string; name: string }
type Equipment = { id: string; name: string; status: string }

export const WorkOrders: React.FC = () => {
  const { role, user } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
  })
  const [assignData, setAssignData] = useState({
    work_order_id: '',
    equipment_id: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [assignWorkOrderTitle, setAssignWorkOrderTitle] = useState('')

  // ---- Fetch data ----
  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          project:projects(id, name),
          employee:employees(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (role === 'employee' && user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .single()
        if (emp) {
          query = query.eq('assigned_to', emp.id)
        }
      }

      const { data: woData, error: woError } = await query
      if (woError) throw woError
      setWorkOrders(woData || [])

      if (role === 'manager') {
        const [{ data: empData }, { data: projData }, { data: eqData }] = await Promise.all([
          supabase.from('employees').select('id, full_name').order('full_name'),
          supabase.from('projects').select('id, name').order('name'),
          supabase.from('equipment').select('id, name, status'),
        ])
        setEmployees(empData || [])
        setProjects(projData || [])
        setEquipment(eqData || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [role, user])

  // ---- Create / Edit Work Order ----
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id || null,
        assigned_to: formData.assigned_to || null,
        status: 'open',
      }

      if (selectedWorkOrder) {
        const { error } = await supabase
          .from('work_orders')
          .update(payload)
          .eq('id', selectedWorkOrder.id)
        if (error) throw error
        setSuccess('Work order updated')
      } else {
        const { error } = await supabase
          .from('work_orders')
          .insert([payload])
        if (error) throw error
        setSuccess('Work order created')
      }
      setShowCreateModal(false)
      setSelectedWorkOrder(null)
      setFormData({ title: '', description: '', project_id: '', assigned_to: '' })
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  // ---- Assign Equipment (Improved) ----
  const handleAssignEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const { work_order_id, equipment_id } = assignData
      if (!work_order_id || !equipment_id) {
        setError('Please select both work order and equipment')
        return
      }

      console.log('Calling assign-equipment with:', { work_order_id, equipment_id })

      const { data, error } = await supabase.functions.invoke('assign-equipment', {
        body: { work_order_id, equipment_id },
      })

      console.log('Response from Edge Function:', { data, error })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || 'Failed to assign equipment')
      }
      if (data?.error) {
        console.error('Edge Function returned error:', data.error)
        throw new Error(data.error)
      }

      setSuccess('Equipment assigned successfully')
      setShowAssignModal(false)
      setAssignData({ work_order_id: '', equipment_id: '' })
      setAssignWorkOrderTitle('')
      fetchData()
    } catch (err) {
      console.error('Assign equipment error:', err)
      setError(err instanceof Error ? err.message : 'Assignment failed')
    }
  }

  // ---- Complete Work Order (Direct DB update) ----
  const handleComplete = async (workOrderId: string) => {
    if (!window.confirm('Mark this work order as completed?')) return
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', workOrderId)
      if (error) throw error
      setSuccess('Work order completed')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
    }
  }

  // ---- Return Equipment (Improved) ----
  const handleReturn = async (assignmentId: string) => {
    if (!window.confirm('Return this equipment?')) return
    setError('')
    setSuccess('')
    try {
      console.log('Calling return-equipment with:', { assignment_id: assignmentId })

      const { data, error } = await supabase.functions.invoke('return-equipment', {
        body: { assignment_id: assignmentId },
      })

      console.log('Response from Edge Function:', { data, error })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || 'Failed to return equipment')
      }
      if (data?.error) {
        console.error('Edge Function returned error:', data.error)
        throw new Error(data.error)
      }

      setSuccess('Equipment returned')
      fetchData()
    } catch (err) {
      console.error('Return equipment error:', err)
      setError(err instanceof Error ? err.message : 'Return failed')
    }
  }

  // ---- Get active assignment for a work order ----
  const handleReturnForWorkOrder = async (workOrderId: string) => {
    try {
      const { data, error } = await supabase
        .from('equipment_assignments')
        .select('id')
        .eq('work_order_id', workOrderId)
        .is('returned_at', null)
        .single()
      if (error) {
        setError('No active equipment assignment found')
        return
      }
      if (data) {
        await handleReturn(data.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Return failed')
    }
  }

  // ---- Helper: status colors ----
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#e5e7eb', color: '#374151' }
      case 'in_progress': return { bg: '#fef3c7', color: '#92400e' }
      case 'completed': return { bg: '#d1fae5', color: '#065f46' }
      default: return { bg: '#e5e7eb', color: '#374151' }
    }
  }

  if (loading) return <div className="login-container">Loading...</div>

  return (
    <div className="login-container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Work Orders</h2>
        {role === 'manager' && (
          <button
            onClick={() => {
              setSelectedWorkOrder(null)
              setFormData({ title: '', description: '', project_id: '', assigned_to: '' })
              setShowCreateModal(true)
            }}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + New Work Order
          </button>
        )}
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

      {/* Work Orders Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Project</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Assigned To</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No work orders found
                </td>
              </tr>
            ) : (
              workOrders.map((wo) => {
                const colors = getStatusColor(wo.status)
                return (
                  <tr key={wo.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem' }}>{wo.title}</td>
                    <td style={{ padding: '0.5rem' }}>{wo.project?.name || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{wo.employee?.full_name || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: colors.bg,
                        color: colors.color,
                      }}>
                        {wo.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Edit (Manager only) */}
                        {role === 'manager' && (
                          <button
                            onClick={() => {
                              setSelectedWorkOrder(wo)
                              setFormData({
                                title: wo.title,
                                description: wo.description || '',
                                project_id: wo.project_id || '',
                                assigned_to: wo.assigned_to || '',
                              })
                              setShowCreateModal(true)
                            }}
                            style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )}
                        {/* Assign Equipment (Manager only, if not completed) */}
                        {role === 'manager' && wo.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setAssignData({ work_order_id: wo.id, equipment_id: '' })
                              setAssignWorkOrderTitle(wo.title)
                              setShowAssignModal(true)
                            }}
                            style={{ padding: '0.25rem 0.5rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Assign Equip
                          </button>
                        )}
                        {/* Complete (if status is in_progress) */}
                        {wo.status === 'in_progress' && (
                          <button
                            onClick={() => handleComplete(wo.id)}
                            style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Complete
                          </button>
                        )}
                        {/* Return Equipment (Manager only, if not open) */}
                        {role === 'manager' && wo.status !== 'open' && (
                          <button
                            onClick={() => handleReturnForWorkOrder(wo.id)}
                            style={{ padding: '0.25rem 0.5rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Return Equip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{selectedWorkOrder ? 'Edit Work Order' : 'New Work Order'}</h3>
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {selectedWorkOrder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Equipment Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h3>Assign Equipment</h3>
            <form onSubmit={handleAssignEquipment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Work Order</label>
                <input
                  type="text"
                  value={assignWorkOrderTitle || 'Loading...'}
                  disabled
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f3f4f6' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Equipment</label>
                <select
                  value={assignData.equipment_id}
                  onChange={(e) => setAssignData({ ...assignData, equipment_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="">Select equipment</option>
                  {equipment.filter(eq => eq.status === 'available').map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
                {equipment.filter(eq => eq.status === 'available').length === 0 && (
                  <small style={{ color: '#6b7280' }}>No available equipment. Add equipment or return checked-out items.</small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}