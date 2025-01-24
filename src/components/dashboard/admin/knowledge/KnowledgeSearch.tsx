'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Database } from '@/lib/types/database.types';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface KnowledgeSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  categories: string[];
}

export interface SearchFilters {
  category: string;
  status: 'all' | 'published' | 'draft';
}

export default function KnowledgeSearch({ onSearch, categories }: KnowledgeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    // Trigger search whenever filters change
    handleSearch();
  }, [selectedCategory, selectedStatus]);

  const handleSearch = () => {
    onSearch(searchQuery, {
      category: selectedCategory,
      status: selectedStatus
    });
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'published' | 'draft')}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedCategory || selectedStatus !== 'all' || searchQuery) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Active Filters:</span>
          {searchQuery && (
            <span className="px-2 py-1 bg-gray-100 rounded-md">
              Search: {searchQuery}
            </span>
          )}
          {selectedCategory && (
            <span className="px-2 py-1 bg-gray-100 rounded-md">
              Category: {selectedCategory}
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="px-2 py-1 bg-gray-100 rounded-md">
              Status: {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
            </span>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('');
              setSelectedStatus('all');
              onSearch('', { category: '', status: 'all' });
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
} 