'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';

export default function TicketFilters() {
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  const statuses = ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriority(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Filter className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-medium text-white">Filters</h2>
      </div>

      {/* Status Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Status</h3>
        <div className="space-y-2">
          {statuses.map((status) => (
            <label key={status} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedStatus.includes(status)}
                onChange={() => handleStatusToggle(status)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
              />
              <span className="text-sm text-gray-300">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Priority</h3>
        <div className="space-y-2">
          {priorities.map((priority) => (
            <label key={priority} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPriority.includes(priority)}
                onChange={() => handlePriorityToggle(priority)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
              />
              <span className="text-sm text-gray-300">{priority}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Date Range</h3>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as 'all' | 'week' | 'month' | 'year')}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Time</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="year">Past Year</option>
        </select>
      </div>

      {/* Reset Filters */}
      {(selectedStatus.length > 0 || selectedPriority.length > 0 || dateRange !== 'all') && (
        <button
          onClick={() => {
            setSelectedStatus([]);
            setSelectedPriority([]);
            setDateRange('all');
          }}
          className="w-full mt-6 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
} 