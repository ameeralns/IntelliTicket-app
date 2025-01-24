"use client"

import { useEffect } from 'react'
import { useForm, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { JsonEditor } from '@/components/ui/json-editor'
import { Separator } from '@/components/ui/separator'

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

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  variables: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface EmailTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate | null
  onSubmit: (values: FormValues) => Promise<void>
}

export function EmailTemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: EmailTemplateDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      subject: '',
      body: '',
      variables: {},
      is_active: true,
    },
  })

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        is_active: template.is_active,
      })
    } else {
      form.reset({
        name: '',
        subject: '',
        body: '',
        variables: {},
        is_active: true,
      })
    }
  }, [template, form])

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white border-0">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {template ? 'Edit Email Template' : 'Create Email Template'}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {template 
              ? 'Update the email template details below.' 
              : 'Create a new email template for your organization.'}
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-900">Template Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Welcome Email" 
                        {...field}
                        className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary" 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-900">Email Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Welcome to our platform!" 
                        {...field}
                        className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary" 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-900">Email Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dear {{name}}, Welcome to..."
                        className="min-h-[200px] font-mono w-full px-3 py-2 bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variables"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-900">Template Variables</FormLabel>
                    <FormControl>
                      <JsonEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={{
                          name: "string",
                          company: "string",
                          role: "string"
                        }}
                        className="bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem className="flex items-center justify-between space-x-2 rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold text-gray-900">Active Status</FormLabel>
                      <FormDescription className="text-sm text-gray-600">
                        Activate or deactivate this email template
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Separator className="my-6" />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90"
              >
                {template ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 