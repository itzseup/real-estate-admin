import React from 'react'

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Closed', label: 'Closed' },
]

/**
 * LeadStatusSelect — reusable dropdown for lead status.
 * Used in both admin and agent dashboards.
 */
export default function LeadStatusSelect({ status, onChange }) {
  return (
    <select
      value={status || 'New'}
      onChange={(e) => onChange(e.target.value)}
      className="font-body text-xs border border-border rounded px-2 py-1"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export const STATUS_OPTIONS_LIST = STATUS_OPTIONS
