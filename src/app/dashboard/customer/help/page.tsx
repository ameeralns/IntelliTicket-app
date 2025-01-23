import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Mail, Phone, MessageCircle, FileText, ExternalLink } from 'lucide-react';

export default async function HelpPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) notFound();

  const faqs = [
    {
      question: 'How do I create a new support ticket?',
      answer: 'To create a new ticket, click on the "New Ticket" button in the sidebar or navigate to the Tickets page and click "Create Ticket". Fill in the required information and submit your request.'
    },
    {
      question: 'What are the support hours?',
      answer: 'Our support team is available Monday through Friday, 9:00 AM to 5:00 PM EST. For urgent issues outside these hours, please use the emergency contact number.'
    },
    {
      question: 'How long does it take to get a response?',
      answer: 'We aim to respond to all tickets within 24 hours. High-priority issues are typically addressed within 4 hours during business hours.'
    },
    {
      question: 'Can I update my ticket after submitting it?',
      answer: 'Yes, you can add comments or additional information to your ticket at any time by accessing it from the "My Tickets" section.'
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Help & Support</h1>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Mail className="w-6 h-6 text-indigo-500 mr-3" />
              <h3 className="text-lg font-semibold text-white">Email Support</h3>
            </div>
            <p className="text-gray-400 mb-4">Send us an email anytime</p>
            <a href="mailto:support@intelliticket.com" className="text-indigo-400 hover:text-indigo-300">
              support@intelliticket.com
            </a>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Phone className="w-6 h-6 text-indigo-500 mr-3" />
              <h3 className="text-lg font-semibold text-white">Phone Support</h3>
            </div>
            <p className="text-gray-400 mb-4">Available during business hours</p>
            <a href="tel:1-800-123-4567" className="text-indigo-400 hover:text-indigo-300">
              1-800-123-4567
            </a>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-6 h-6 text-indigo-500 mr-3" />
              <h3 className="text-lg font-semibold text-white">Live Chat</h3>
            </div>
            <p className="text-gray-400 mb-4">Chat with our support team</p>
            <button className="text-indigo-400 hover:text-indigo-300">
              Start Chat
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="/dashboard/customer/knowledge"
              className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FileText className="w-5 h-5 text-indigo-500 mr-3" />
              <div>
                <h3 className="font-medium text-white">Knowledge Base</h3>
                <p className="text-sm text-gray-400">Browse our help articles</p>
              </div>
            </Link>
            <Link 
              href="/dashboard/customer/tickets/new"
              className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-indigo-500 mr-3" />
              <div>
                <h3 className="font-medium text-white">Submit a Ticket</h3>
                <p className="text-sm text-gray-400">Create a new support request</p>
              </div>
            </Link>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-700 last:border-0 pb-6 last:pb-0">
                <h3 className="text-lg font-medium text-white mb-2">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 