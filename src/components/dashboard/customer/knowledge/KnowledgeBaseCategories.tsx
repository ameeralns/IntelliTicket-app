'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Category {
  name: string;
  count: number;
}

interface KnowledgeBaseCategoriesProps {
  categories: Category[];
}

export default function KnowledgeBaseCategories({ categories }: KnowledgeBaseCategoriesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === currentCategory) {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Categories</h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category.name}
            onClick={() => handleCategoryClick(category.name)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors',
              currentCategory === category.name
                ? 'bg-blue-500/10 text-blue-500'
                : 'text-gray-400 hover:bg-gray-800'
            )}
          >
            <span>{category.name}</span>
            <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">
              {category.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
} 