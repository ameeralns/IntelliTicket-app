'use client';

import { useEffect, useState } from 'react';
import { Database } from '@/lib/types/database.types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileText, FolderPlus, Eye, Upload, X, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: Article | null;
  categories: string[];
  onSave: (data: {
    title: string;
    content: string;
    category: string | null;
    is_published: boolean;
    pdf_url?: string | null;
    pdf_filename?: string | null;
    pdf_size_bytes?: number | null;
  }) => Promise<void>;
}

export default function ArticleDialog({
  open,
  onOpenChange,
  article,
  categories,
  onSave,
}: ArticleDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setCategory(article.category || null);
      setIsPublished(article.is_published);
      setSelectedFile(null);
    } else {
      setTitle('');
      setContent('');
      setCategory(null);
      setIsPublished(false);
      setSelectedFile(null);
    }
  }, [article]);

  const extractPDFContent = async (file: File) => {
    try {
      setIsExtracting(true);
      
      // For now, we'll just use the file name and create a placeholder for the content
      const placeholderContent = `PDF File: ${file.name}\n` +
        `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\n` +
        `Note: This PDF has been attached to the article. Users can download and view the original PDF file.`;
      
      setContent((prevContent) => {
        // If there's existing content, append the PDF info
        if (prevContent.trim()) {
          return `${prevContent}\n\n---\n\n${placeholderContent}`;
        }
        return placeholderContent;
      });
      
      toast.success('PDF file attached successfully');
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF file');
      setSelectedFile(null);
      const input = document.getElementById('pdf-upload') as HTMLInputElement;
      if (input) input.value = '';
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      await extractPDFContent(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    const input = document.getElementById('pdf-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const uploadPDF = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = 'pdf';
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('article-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to upload PDF file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let pdfUrl = article?.pdf_url;
      let pdfFilename = article?.pdf_filename;
      let pdfSize = article?.pdf_size_bytes;

      if (selectedFile) {
        pdfUrl = await uploadPDF(selectedFile);
        if (pdfUrl) {
          pdfFilename = selectedFile.name;
          pdfSize = selectedFile.size;
        }
      }

      await onSave({
        title,
        content,
        category: category || null,
        is_published: isPublished,
        pdf_url: pdfUrl,
        pdf_filename: pdfFilename,
        pdf_size_bytes: pdfSize,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100/80 dark:bg-gray-900">
                <FileText className="h-6 w-6 text-gray-800 dark:text-gray-200" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {article ? 'Edit Article' : 'Create New Article'}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  {article ? 'Update the details of your knowledge base article.' : 'Add a new article to your knowledge base.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="bg-gray-200 dark:bg-gray-800" />

          <div className="grid gap-6 px-2">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
                className="h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Category
              </Label>
              <Select
                value={category || undefined}
                onValueChange={(value) => setCategory(value === '' ? null : value)}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                  <SelectValue>
                    {category === null ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <FolderPlus className="h-4 w-4" />
                        <span>Select a category</span>
                      </div>
                    ) : category === 'no-category' ? (
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span>No Category</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span>{category}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <SelectItem 
                    value="no-category" 
                    className="focus:bg-gray-100 dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      <span className="font-medium">No Category</span>
                    </div>
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem 
                      key={cat} 
                      value={cat} 
                      className="focus:bg-gray-100 dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        <span className="font-medium">{cat}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pdf-upload" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                PDF Attachment
              </Label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isExtracting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    className="w-full border-dashed border-2 h-24 flex flex-col items-center justify-center gap-2"
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-transparent dark:border-gray-400 dark:border-t-transparent" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Extracting content...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload PDF (max 10MB)
                        </span>
                      </>
                    )}
                  </Button>
                </div>
                {(selectedFile || article?.pdf_url) && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedFile?.name || article?.pdf_filename}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedFile 
                            ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : article?.pdf_size_bytes 
                              ? `${(article.pdf_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                              : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Content
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here..."
                className="h-[300px] resize-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                required
              />
            </div>

            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              isPublished 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isPublished 
                    ? 'bg-green-100 dark:bg-green-900/40' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Eye className={`h-5 w-5 ${
                    isPublished 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                <div>
                  <Label htmlFor="published" className={`font-semibold ${
                    isPublished 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {isPublished ? 'Published' : 'Not Published'}
                  </Label>
                  <p className={`text-sm ${
                    isPublished 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {isPublished 
                      ? 'This article is visible to users' 
                      : 'Make this article visible to users'}
                  </p>
                </div>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
                className={`${isPublished 
                  ? 'bg-green-600 dark:bg-green-500' 
                  : ''}`}
              />
            </div>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-800" />

          <DialogFooter className="px-2">
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
              >
                {isSaving ? 'Saving...' : article ? 'Save Changes' : 'Create Article'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 