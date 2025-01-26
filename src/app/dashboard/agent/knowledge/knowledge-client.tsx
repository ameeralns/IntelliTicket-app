'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Book,
  Search,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Eye,
  Clock,
  FileText,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ArticleDialog from './components/ArticleDialog';
import DeleteDialog from './components/DeleteDialog';

// Category color mapping
const categoryColors: { [key: string]: { bg: string; hover: string; border: string; text: string } } = {
  default: {
    bg: 'bg-white dark:bg-gray-800',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-750',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-900 dark:text-gray-100'
  },
  'Getting Started': {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100'
  },
  'Troubleshooting': {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-100'
  },
  'Best Practices': {
    bg: 'bg-green-50 dark:bg-green-900/20',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-900 dark:text-green-100'
  },
  'FAQs': {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-900 dark:text-purple-100'
  },
  'General': {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/30',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-900 dark:text-teal-100'
  },
  'Tips & Tricks': {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-900 dark:text-rose-100'
  }
};

function getCategoryColors(category: string | null) {
  return categoryColors[category || 'default'] || categoryColors.default;
}

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface KnowledgeClientProps {
  articles: Article[];
  categories: string[];
  organizationId: string;
}

export default function KnowledgeClient({
  articles: initialArticles,
  categories: initialCategories,
  organizationId,
}: KnowledgeClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'article'; id: string } | null>(null);
  const supabase = createClientComponentClient<Database>();

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setIsArticleDialogOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsArticleDialogOpen(true);
  };

  const handleDelete = (type: 'article', id: string) => {
    setDeletingItem({ type, id });
    setIsDeleteDialogOpen(true);
  };

  const handleArticleSave = async (articleData: {
    title: string;
    content: string;
    category: string | null;
    is_published: boolean;
  }) => {
    try {
      if (editingArticle) {
        const { data, error } = await supabase
          .from('knowledge_articles')
          .update({
            ...articleData,
            organization_id: organizationId,
            updated_at: new Date().toISOString(),
          })
          .eq('article_id', editingArticle.article_id)
          .select()
          .single();

        if (error) throw error;
        setArticles(prev => prev.map(a => a.article_id === data.article_id ? data : a));
        toast.success('Article updated successfully');
      } else {
        const { data, error } = await supabase
          .from('knowledge_articles')
          .insert({
            ...articleData,
            organization_id: organizationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: [],
            view_count: 0,
          })
          .select()
          .single();

        if (error) throw error;
        setArticles(prev => [...prev, data]);
        toast.success('Article created successfully');
      }
      setIsArticleDialogOpen(false);
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('article_id', deletingItem.id);

      if (error) throw error;
      setArticles(prev => prev.filter(a => a.article_id !== deletingItem.id));
      toast.success('Article deleted successfully');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-white dark:via-gray-200 dark:to-white">
                Knowledge Base
              </h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Manage and organize your team's knowledge articles
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-900 shadow-lg">
              <Book className="h-10 w-10 text-white" />
            </div>
          </div>
          
          {/* Gradient Separator */}
          <div className="h-px bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 dark:from-gray-800 dark:via-gray-600 dark:to-gray-800" />
        </div>

        {/* Search and Filters */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm py-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="All Categories">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      <span>{selectedCategory === 'all' ? 'All Categories' : selectedCategory}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <SelectItem 
                    value="all" 
                    className="focus:bg-gray-100 dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      <span className="font-medium">All Categories</span>
                    </div>
                  </SelectItem>
                  {initialCategories.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      className="focus:bg-gray-100 dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        <span className="font-medium">{category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleCreateArticle}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Article
              </Button>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {filteredArticles.map((article) => {
            const colors = getCategoryColors(article.category);
            return (
              <Card
                key={article.article_id}
                onClick={() => {
                  setEditingArticle(article);
                  setIsArticleDialogOpen(true);
                }}
                className={`group relative cursor-pointer overflow-hidden transition-all duration-200 ${colors.bg} ${colors.hover} border ${colors.border} hover:shadow-lg transform hover:-translate-y-1`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {article.category ? (
                        <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}>
                          <FolderPlus className="h-3.5 w-3.5 mr-1" />
                          {article.category}
                        </Badge>
                      ) : null}
                      {article.pdf_url && (
                        <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {article.pdf_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (article.pdf_url) {
                              window.open(article.pdf_url, '_blank');
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingArticle(article);
                          setIsArticleDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem({ type: 'article', id: article.article_id });
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <CardTitle className={`text-xl font-semibold ${colors.text} line-clamp-2`}>
                      {article.title}
                    </CardTitle>
                    <CardDescription className="mt-2.5 text-gray-600 dark:text-gray-400 line-clamp-3">
                      {article.content}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardFooter className={`flex items-center justify-between border-t ${colors.border} ${colors.bg}/50`}>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {article.pdf_url && (
                      <Button
                        variant="ghost"
                        className={`h-8 flex items-center gap-1.5 px-2 ${colors.hover}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (article.pdf_url) {
                            window.open(article.pdf_url, '_blank');
                          }
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-medium">{article.pdf_filename}</span>
                        <span className="text-xs">({(article.pdf_size_bytes! / (1024 * 1024)).toFixed(2)} MB)</span>
                      </Button>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${colors.text}`}>
                    <Clock className="h-4 w-4" />
                    {format(new Date(article.updated_at || article.created_at || new Date()), 'MMM d, yyyy')}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <ArticleDialog
        open={isArticleDialogOpen}
        onOpenChange={setIsArticleDialogOpen}
        article={editingArticle}
        categories={initialCategories}
        onSave={handleArticleSave}
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        type="article"
      />
    </div>
  );
} 