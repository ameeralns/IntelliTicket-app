import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { EmailTemplateList } from '@/components/dashboard/admin/email-templates/EmailTemplateList'

export const dynamic = 'force-dynamic'

export default async function EmailTemplatesPage() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: templates } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold text-black">Email Templates</h1>
        <p className="text-lg text-black">
          Manage your organization's email templates for various communications.
        </p>
      </div>
      <div className="bg-card shadow-sm border border-black rounded-lg overflow-hidden">
        <EmailTemplateList initialTemplates={templates || []} />
      </div>
    </div>
  )
} 