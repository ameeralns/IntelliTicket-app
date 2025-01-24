"use client"

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { EmailTemplateDialog } from './EmailTemplateDialog'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface EmailTemplate {
  template_id: string
  name: string
  subject: string
  body: string
  variables: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface EmailTemplateListProps {
  initialTemplates: EmailTemplate[]
}

export function EmailTemplateList({ initialTemplates }: EmailTemplateListProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handleCreate = async (template: Omit<EmailTemplate, 'template_id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([template])
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      })
      return
    }

    setTemplates([data, ...templates])
    setIsDialogOpen(false)
    toast({
      title: 'Success',
      description: 'Template created successfully',
    })
  }

  const handleUpdate = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from('email_templates')
      .update({
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        is_active: template.is_active,
      })
      .eq('template_id', template.template_id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      })
      return
    }

    setTemplates(templates.map(t => 
      t.template_id === template.template_id ? template : t
    ))
    setEditingTemplate(null)
    toast({
      title: 'Success',
      description: 'Template updated successfully',
    })
  }

  const handleDelete = async (templateId: string) => {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('template_id', templateId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      })
      return
    }

    setTemplates(templates.filter(t => t.template_id !== templateId))
    setTemplateToDelete(null)
    setIsDeleteDialogOpen(false)
    toast({
      title: 'Success',
      description: 'Template deleted successfully',
    })
  }

  const confirmDelete = (templateId: string) => {
    setTemplateToDelete(templateId)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div>
      <div className="p-6 border-b border-black bg-muted/40">
        <div className="flex items-center justify-between">
          <p className="text-sm text-black">
            {templates.length} template{templates.length !== 1 ? 's' : ''} total
          </p>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            size="sm" 
            className="inline-flex items-center bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-md shadow-sm font-bold text-base"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-black">
              <TableHead className="w-[250px] font-semibold text-black">Name</TableHead>
              <TableHead className="w-[350px] font-semibold text-black">Subject</TableHead>
              <TableHead className="w-[120px] font-semibold text-black">Status</TableHead>
              <TableHead className="w-[180px] font-semibold text-black">Last Updated</TableHead>
              <TableHead className="w-[100px] text-right font-semibold text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-black">
                  No email templates found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.template_id} className="hover:bg-muted/50 border-black">
                  <TableCell className="font-medium text-black">
                    {template.name}
                  </TableCell>
                  <TableCell className="text-black">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      template.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-black">
                    {new Date(template.updated_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(template)}
                      className="h-8 w-8 mr-2"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(template.template_id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmailTemplateDialog
        open={isDialogOpen || !!editingTemplate}
        onOpenChange={(open: boolean) => {
          setIsDialogOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        template={editingTemplate}
        onSubmit={editingTemplate ? handleUpdate : handleCreate}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the email template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && handleDelete(templateToDelete)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 