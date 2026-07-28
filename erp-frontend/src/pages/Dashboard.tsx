import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

type WorkOrder = {
  id: string
  title: string
  status: string
  created_at: string
  project?: { name: string }
  employee?: { full_name: string }
}

type DashboardStats = {
  total: number
  open: number
  inProgress: number
  completed: number
}

export const Dashboard: React.FC = () => {
  const { role, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
  })
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrder[]>([])
  const [error, setError] = useState('')

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      let query = supabase.from('work_orders').select('*', { count: 'exact', head: false })

      // If employee, only their work orders
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

      // Fetch all work orders for stats
      const { data, error } = await query
      if (error) throw error

      const total = data?.length || 0
      const open = data?.filter(w => w.status === 'open').length || 0
      const inProgress = data?.filter(w => w.status === 'in_progress').length || 0
      const completed = data?.filter(w => w.status === 'completed').length || 0

      setStats({ total, open, inProgress, completed })

      // Fetch recent work orders (last 5)
      let recentQuery = supabase
        .from('work_orders')
        .select(`
          *,
          project:projects(name),
          employee:employees(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (role === 'employee' && user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .single()
        if (emp) {
          recentQuery = recentQuery.eq('assigned_to', emp.id)
        }
      }

      const { data: recentData, error: recentError } = await recentQuery
      if (recentError) throw recentError
      setRecentWorkOrders(recentData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [role, user])

  // ---- Helper to get status color ----
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#e5e7eb', color: '#374151' }
      case 'in_progress': return { bg: '#fef3c7', color: '#92400e' }
      case 'completed': return { bg: '#d1fae5', color: '#065f46' }
      default: return { bg: '#e5e7eb', color: '#374151' }
    }
  }

  if (loading) return <div className="login-container">Loading dashboard...</div>

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.8rem', color: '#1f2937' }}>
        {role === 'manager' ? 'Dashboard' : 'My Dashboard'}
      </h2>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Open</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>{stats.open}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>In Progress</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.inProgress}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Completed</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.completed}</div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>Recent Work Orders</h3>
          <Link to="/work-orders" style={{ fontSize: '0.9rem', color: '#2563eb', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        {recentWorkOrders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
            No work orders yet. {role === 'manager' && 'Create one from the Work Orders page.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Project</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Assigned To</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkOrders.map((wo) => {
                  const colors = getStatusColor(wo.status)
                  return (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem' }}>{wo.title}</td>
                      <td style={{ padding: '0.5rem' }}>{wo.project?.name || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>{wo.employee?.full_name || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: colors.bg,
                          color: colors.color,
                        }}>
                          {wo.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions (Manager only) */}
      {role === 'manager' && (
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/work-orders"
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}
          >
            + New Work Order
          </Link>
          <Link
            to="/clients"
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}
          >
            + New Client
          </Link>
          <Link
            to="/equipment"
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}
          >
            + New Equipment
          </Link>
        </div>
      )}
    </div>
  )
}