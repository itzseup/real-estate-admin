import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { base44 } from '@/api/base44Client.js'
import { supabaseAdmin } from '@/api/supabaseClient.js'
import { useAuth } from '@/lib/AuthContext.jsx'
import Seo from '@/components/Seo.jsx'
import { Plus, Edit2, Trash2, Save, X, LogOut, Settings, Copy, Check } from 'lucide-react'
import LeadStatusSelect from '@/components/LeadStatusSelect.jsx'

const ADMIN_EMAILS = ["rafat@citywalkrealestatellc.com"]

export default function AdminDashboard() {
  const { user, signOut, isAdmin, createAgentAuth } = useAuth()
  const navigate = useNavigate()

  const demoLoggedIn = localStorage.getItem('demo_admin_session') === 'true' || !!localStorage.getItem('demo_admin_session')
  const supabaseUser = user
  const authenticated = supabaseUser || (demoLoggedIn && ADMIN_EMAILS.includes(supabaseUser?.email))

  // Check access: either demo admin or Supabase user with admin email
  const sessionEmail = supabaseUser?.email
  const hasAccess = demoLoggedIn || (sessionEmail && ADMIN_EMAILS.includes(sessionEmail)) || isAdmin()

  const [activeTab, setActiveTab] = useState('leads')
  const [properties, setProperties] = useState([])
  const [agents, setAgents] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [copiedCredential, setCopiedCredential] = useState(false)

  // Redirect to /login if not authenticated
  useEffect(() => {
    if (!hasAccess) {
      navigate('/login', { replace: true, state: { from: '/admin' } })
    }
  }, [hasAccess, navigate])

  useEffect(() => {
    if (!hasAccess) return
    loadData()
  }, [hasAccess])

  async function loadData() {
    setLoading(true)
    try {
      const [propertiesData, agentsData, inquiriesData] = await Promise.all([
        base44.entities.Property.list('-created_date', 100),
        base44.entities.Agent.list('-created_date', 50),
        base44.entities.Inquiry.list('-created_date', 100),
      ])
      setProperties(propertiesData || [])
      setAgents(agentsData || [])
      setInquiries(inquiriesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInquiryUpdate(id, field, value) {
    try {
      await base44.entities.Inquiry.update(id, { [field]: value })
      await loadData()
    } catch (error) {
      console.error('Error updating inquiry:', error)
      alert('Failed to update inquiry.')
    }
  }

  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  function openCreate(type) {
    if (type === 'property') {
      setEditingItem({
        type: 'property',
        data: {
          title: '',
          description: '',
          price: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'AE',
          bedrooms: '',
          bathrooms: '',
          area_sqft: '',
          property_type: 'condo',
          status: 'for_sale',
          featured: false,
          agent_id: '',
          image_urls: [],
        },
      })
      setIsCreating(true)
    } else {
      setEditingItem({
        type: 'agent',
        data: {
          name: '',
          email: '',
          phone: '',
          bio: '',
          avatar_url: '',
          properties_count: 0,
          auth_password: '',
        },
      })
      setIsCreating(true)
    }
  }

  function openEdit(type, item) {
    setEditingItem({ type, data: { ...item } })
    setIsCreating(false)
  }

  function closeEditor() {
    setEditingItem(null)
    setIsCreating(false)
    setCreatedCredentials(null)
  }

  async function handleSave() {
    if (!editingItem) return
    const { type, data } = editingItem

    try {
      if (type === 'property') {
        if (isCreating) {
          await base44.entities.Property.create(data)
        } else {
          await base44.entities.Property.update(data.id, data)
        }
      } else if (type === 'agent') {
        // Generate or use existing password
        const password = data.auth_password || Math.random().toString(36).slice(-10) + 'Aa1!'

        if (isCreating) {
          // Create agent record in DB
          await base44.entities.Agent.create({
            name: data.name,
            email: data.email,
            phone: data.phone,
            bio: data.bio,
            avatar_url: data.avatar_url,
            properties_count: data.properties_count || 0,
          })

          // Create auth user for the agent
          const { user: authUser, error: authError } = await createAgentAuth(data.email, password)

          if (authError) {
            alert('Agent created, but auth user creation failed. Check Supabase admin config.')
          } else {
            setCreatedCredentials({
              email: data.email,
              password: password,
            })
          }
        } else {
          await base44.entities.Agent.update(data.id, {
            name: data.name,
            email: data.email,
            phone: data.phone,
            bio: data.bio,
            avatar_url: data.avatar_url,
            properties_count: data.properties_count,
          })
        }
      }

      await loadData()
      if (type === 'agent' && isCreating) {
        // Keep the editor open to show credentials
        return
      }
      closeEditor()
    } catch (error) {
      console.error('Error saving:', error)
      alert('There was an error saving. Please try again.')
    }
  }

  async function handleDelete(type, id) {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      if (type === 'property') {
        await base44.entities.Property.delete(id)
      } else if (type === 'agent') {
        await base44.entities.Agent.delete(id)
      }
      await loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('There was an error deleting. Please try again.')
    }
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setEditingItem({
      ...editingItem,
      data: {
        ...editingItem.data,
        [name]: fieldValue,
      },
    })
  }

  function handleImageUrlsChange(e) {
    const urls = e.target.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    setEditingItem({
      ...editingItem,
      data: {
        ...editingItem.data,
        image_urls: urls,
      },
    })
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setCopiedCredential(true)
    setTimeout(() => setCopiedCredential(false), 2000)
  }

  if (!hasAccess || loading) {
    return (
      <div className="min-h-screen bg-white py-24 md:py-40">
        <div className="max-w-[1400px] mx-auto px-[4%] md:px-[2%]">
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 md:py-24 px-[4%] md:px-[2%]">
      <Seo
        title="Admin Dashboard"
        description="Self-service admin panel for managing properties, agents, and leads."
        url="/admin"
        noIndex
      />
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-display-xl font-light">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {!editingItem && (
              <button
                onClick={() => openCreate(activeTab === 'properties' ? 'property' : 'agent')}
                className="flex items-center gap-2 px-4 py-2 bg-forest text-white font-body text-xs tracking-label uppercase hover:bg-forest/90 transition-colors"
              >
                <Plus size={16} />
                Add New {activeTab === 'properties' ? 'Property' : 'Agent'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-border text-foreground font-body text-xs tracking-label uppercase hover:bg-secondary transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {['leads', 'agents', 'properties', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-body text-xs tracking-label uppercase pb-3 px-1 transition-colors ${
                activeTab === tab
                  ? 'text-forest border-b-2 border-forest'
                  : 'text-muted-foreground hover:text-forest'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === 'leads' ? inquiries.length : tab === 'agents' ? agents.length : tab === 'properties' ? properties.length : 'Settings'})
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="border border-border/20 rounded-lg p-6">
              <h2 className="font-display text-lg mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">
                    Admin Email
                  </label>
                  <p className="font-body text-sm text-foreground">{sessionEmail || 'Not logged in'}</p>
                </div>
                <div>
                  <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm"
                  />
                </div>
                <button className="px-4 py-2 bg-forest text-white font-body text-xs tracking-label uppercase hover:bg-forest/90 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
            <div className="border border-border/20 rounded-lg p-6">
              <h2 className="font-display text-lg mb-4">Demo Credentials</h2>
              <p className="font-body text-sm text-muted-foreground mb-2">
                For demo mode (without Supabase configured):
              </p>
              <div className="font-body text-xs text-muted-foreground space-y-1">
                <p>Admin Email: rafat@citywalkrealestatellc.com</p>
                <p>Admin Password: Shahood@123</p>
                <p>Agent Password: Shahood@123 (for any agent email)</p>
              </div>
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="overflow-x-auto">
            {inquiries.length === 0 ? (
              <p className="font-body text-muted-foreground py-8 text-center">
                No inquiries yet. Leads will appear here when visitors submit the contact form.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Customer</th>
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Contact</th>
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Type</th>
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Status</th>
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Assign to Agent</th>
                    <th className="text-left font-body text-xs tracking-label uppercase text-muted-foreground py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="border-b border-border">
                      <td className="py-3 px-4">
                        <p className="font-body font-medium text-foreground">{inquiry.full_name || inquiry.name}</p>
                        {inquiry.message && (
                          <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">{inquiry.message}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 font-body text-sm text-foreground">
                          {inquiry.email}
                          {inquiry.phone && <span>{inquiry.phone}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-body text-xs text-muted-foreground">{inquiry.inquiry_type || 'General'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <LeadStatusSelect
                          status={inquiry.status || 'New'}
                          onChange={(status) => handleInquiryUpdate(inquiry.id, 'status', status)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={inquiry.agent_assigned || ''}
                          onChange={(e) =>
                            handleInquiryUpdate(inquiry.id, 'agent_assigned', e.target.value || null)
                          }
                          className="font-body text-xs border border-border rounded px-2 py-1"
                        >
                          <option value="">Unassigned</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-body text-xs text-muted-foreground">
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {agents.length === 0 ? (
              <p className="font-body text-muted-foreground py-8 text-center">No agents yet. Add one to get started.</p>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="border border-border/20 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {agent.avatar_url && (
                      <img src={agent.avatar_url} alt={agent.name} className="w-16 h-16 object-cover rounded-full" />
                    )}
                    <div>
                      <h3 className="font-display text-lg">{agent.name}</h3>
                      <p className="font-body text-sm text-muted-foreground">{agent.email || agent.phone || 'No contact details set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit('agent', agent)}
                      className="p-2 text-muted-foreground hover:text-forest"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete('agent', agent.id)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {properties.length === 0 ? (
              <p className="font-body text-muted-foreground py-8 text-center">No properties yet. Add one to get started.</p>
            ) : (
              properties.map((property) => (
                <div key={property.id} className="border border-border/20 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {property.featured_image && (
                      <img src={property.featured_image} alt={property.title} className="w-16 h-16 object-cover rounded" />
                    )}
                    <div>
                      <h3 className="font-display text-lg">{property.title}</h3>
                      <p className="font-body text-sm text-muted-foreground">
                        {property.city} · {property.property_type} ·{' '}
                        {property.price ? `$${property.price.toLocaleString()}` : 'Price on request'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit('property', property)}
                      className="p-2 text-muted-foreground hover:text-forest"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete('property', property.id)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Editor Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="font-display text-xl">
                  {isCreating ? 'Add New' : 'Edit'} {editingItem.type === 'property' ? 'Property' : 'Agent'}
                </h2>
                {createdCredentials && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(createdCredentials, null, 2))}
                    className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 font-body text-xs rounded hover:bg-green-200"
                    title="Copy credentials"
                  >
                    {copiedCredential ? <Check size={16} /> : <Copy size={16} />}
                    {copiedCredential ? 'Copied!' : 'Copy Credentials'}
                  </button>
                )}
                <button onClick={closeEditor} className="p-2 hover:bg-secondary rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Credentials display after creating agent */}
                {typeIsAgent(editingItem) && isCreating && createdCredentials && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-display text-sm font-medium text-green-900 mb-2">Agent Created Successfully!</h3>
                    <p className="font-body text-sm text-green-800 mb-1">
                      <strong>Email:</strong> {createdCredentials.email}
                    </p>
                    <p className="font-body text-sm text-green-800">
                      <strong>Password:</strong> {createdCredentials.password}
                    </p>
                    <p className="font-body text-xs text-green-700 mt-2">
                      Share these credentials with the agent so they can log in at /agent-login
                    </p>
                  </div>
                )}
                {editingItem.type === 'property' ? (
                  <>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Title *</label>
                      <input type="text" name="title" required value={editingItem.data.title} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Price</label>
                      <input type="number" name="price" value={editingItem.data.price} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Bedrooms</label>
                        <input type="number" name="bedrooms" value={editingItem.data.bedrooms} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                      </div>
                      <div>
                        <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Bathrooms</label>
                        <input type="number" name="bathrooms" value={editingItem.data.bathrooms} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Property Type</label>
                      <select name="property_type" value={editingItem.data.property_type} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm">
                        <option value="condo">Condo</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="apartment">Apartment</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Status</label>
                      <select name="status" value={editingItem.data.status} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm">
                        <option value="for_sale">For Sale</option>
                        <option value="for_rent">For Rent</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">City</label>
                      <input type="text" name="city" value={editingItem.data.city} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Address</label>
                      <input type="text" name="address" value={editingItem.data.address} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Description</label>
                      <textarea name="description" rows={4} value={editingItem.data.description} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Image URLs (one per line)</label>
                      <textarea name="image_urls" rows={3} placeholder="https://example.com/image1.jpg" value={editingItem.data.image_urls?.join('\n') || ''} onChange={handleImageUrlsChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm resize-none" />
                      <p className="font-body text-xs text-muted-foreground mt-1">Get image URLs from your image host or CDN. The first URL becomes the featured image.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Name *</label>
                      <input type="text" name="name" required value={editingItem.data.name} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Email</label>
                        <input type="email" name="email" value={editingItem.data.email} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                      </div>
                      <div>
                        <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Phone</label>
                        <input type="tel" name="phone" value={editingItem.data.phone} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                      </div>
                    </div>
                    {isCreating && (
                      <div>
                        <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Auth Password (leave blank for auto-generated)</label>
                        <input type="password" name="auth_password" value={editingItem.data.auth_password} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" placeholder="Auto-generate if empty" />
                      </div>
                    )}
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Bio</label>
                      <textarea name="bio" rows={4} value={editingItem.data.bio} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Photo URL</label>
                      <input type="url" name="avatar_url" placeholder="https://example.com/photo.jpg" value={editingItem.data.avatar_url} onChange={handleInputChange} className="w-full px-4 py-3 border border-border rounded-lg font-body text-sm" />
                    </div>
                  </>
                )}
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button onClick={closeEditor} className="px-4 py-2 bg-secondary font-body text-xs tracking-label uppercase hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-forest text-white font-body text-xs tracking-label uppercase hover:bg-forest/90 transition-colors">
                  <Save size={16} />
                  {isCreating ? 'Create' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function typeIsAgent(editingItem) {
  return editingItem?.type === 'agent'
}
