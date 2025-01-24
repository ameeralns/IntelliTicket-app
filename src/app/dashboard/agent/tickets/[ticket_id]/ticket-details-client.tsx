"use client";

import { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Paperclip,
  X,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

interface Attachment {
  attachment_id: string;
  file_name: string;
  file_url: string;
}

interface Interaction {
  interaction_id: string;
  content: string;
  created_at: string;
  agent?: {
    name: string;
  };
  customer?: {
    name: string;
  };
  attachments?: Attachment[];
}

interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  ticket_tags?: {
    tag: {
      name: string;
    };
  }[];
  interactions: Interaction[];
}

interface TicketDetailsProps {
  ticket: Ticket;
  session: {
    user: {
      id: string;
    }
  };
}

export default function TicketDetailsClient({ ticket: initialTicket, session }: TicketDetailsProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [newInteraction, setNewInteraction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function handleStatusChange(newStatus: string) {
    try {
      toast.loading("Updating ticket status...");

      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.ticket_id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { data: newInteraction, error: interactionError } = await supabase
        .from('interactions')
        .insert({
          ticket_id: ticket.ticket_id,
          agent_id: session.user.id,
          content: `Status changed to ${newStatus}`,
          interaction_type: 'Note'
        })
        .select('*, agent:agents(name)')
        .single();

      if (interactionError) throw interactionError;
      if (!newInteraction) throw new Error('No interaction data returned');

      setTicket(prev => ({ 
        ...prev, 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        interactions: [...prev.interactions, newInteraction]
      }));
      
      toast.dismiss();
      toast.success(`Ticket status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.dismiss();
      toast.error("Failed to update ticket status");
    }
  }

  async function handlePriorityChange(newPriority: string) {
    try {
      // Show loading toast
      toast.loading("Updating ticket priority...");

      // Update the ticket priority
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.ticket_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create a priority change interaction
      const { error: interactionError, data: newInteraction } = await supabase
        .from('interactions')
        .insert({
          ticket_id: ticket.ticket_id,
          agent_id: session.user.id,
          content: `Priority changed to ${newPriority}`,
          interaction_type: 'Note'
        })
        .select('*, agent:agents(name)')
        .single();

      if (interactionError) throw interactionError;

      // Update local state
      setTicket(prev => ({ 
        ...prev, 
        priority: newPriority, 
        updated_at: new Date().toISOString(),
        interactions: [...prev.interactions, newInteraction]
      }));
      
      toast.dismiss();
      toast.success(`Ticket priority updated to ${newPriority}`);
    } catch (error) {
      console.error('Error updating ticket priority:', error);
      toast.dismiss();
      toast.error("Failed to update ticket priority");
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilesUpload = async (ticketId: string, interactionId: string) => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${interactionId}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      try {
        const { data, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        return {
          fileName: file.name,
          fileUrl: publicUrl
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  async function handleSubmitInteraction(e: React.FormEvent) {
    e.preventDefault();
    if ((!newInteraction.trim() && files.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      toast.loading("Sending message...");

      // Create the interaction first
      const { data: interaction, error: interactionError } = await supabase
        .from('interactions')
        .insert({
          ticket_id: ticket.ticket_id,
          agent_id: session.user.id,
          content: newInteraction,
          interaction_type: 'Chat'
        })
        .select('*, agent:agents(name)')
        .single();

      if (interactionError) throw interactionError;

      let attachments: Attachment[] = [];
      
      // If there are files, upload them
      if (files.length > 0) {
        try {
          const uploadedFiles = await handleFilesUpload(ticket.ticket_id, interaction.interaction_id);
          
          // Create attachment records
          const { data: attachmentData, error: attachmentError } = await supabase
            .from('attachments')
            .insert(
              uploadedFiles.map(file => ({
                ticket_id: ticket.ticket_id,
                interaction_id: interaction.interaction_id,
                file_name: file.fileName,
                file_url: file.fileUrl
              }))
            )
            .select();

          if (attachmentError) {
            console.error('Error creating attachment records:', attachmentError);
            throw attachmentError;
          }

          attachments = attachmentData;
        } catch (uploadError) {
          console.error('Error handling file uploads:', uploadError);
          throw uploadError;
        }
      }

      // Update local state with interaction and its attachments
      const interactionWithAttachments = {
        ...interaction,
        attachments
      };

      setTicket(prev => ({
        ...prev,
        interactions: [...prev.interactions, interactionWithAttachments],
        updated_at: new Date().toISOString()
      }));
      
      setNewInteraction('');
      setFiles([]);
      toast.dismiss();
      toast.success("Message sent successfully");
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast.dismiss();
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadgeStyles(status: string) {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'in progress':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
      case 'resolved':
        return 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'closed':
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400 border border-gray-200 dark:border-gray-800';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400 border border-gray-200 dark:border-gray-800';
    }
  }

  function getPriorityBadgeStyles(priority: string) {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800';
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Fixed Header */}
      <div className="flex-none p-4 px-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/agent/tickets')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← Back to Tickets
            </Button>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-[180px] bg-white dark:bg-gray-900">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority:</span>
                <Select
                  value={ticket.priority}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="w-[180px] bg-white dark:bg-gray-900">
                    <SelectValue placeholder="Update Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="space-y-8">
            {/* Ticket Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {ticket.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <div>
                      Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={"px-4 py-2 rounded-lg text-sm font-medium " + getStatusBadgeStyles(ticket.status)}>
                    {ticket.status}
                  </div>
                  <div className={"px-4 py-2 rounded-lg text-sm font-medium " + getPriorityBadgeStyles(ticket.priority)}>
                    {ticket.priority}
                  </div>
                </div>
              </div>

              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Main Content - Interactions */}
              <div className="col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <div className="border-b border-gray-100 dark:border-gray-700 p-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Interactions
                      </h2>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {ticket.interactions.map((interaction: Interaction) => (
                        <div
                          key={interaction.interaction_id}
                          className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-700">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {interaction.agent?.name || interaction.customer?.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}
                                </div>
                              </div>
                              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {interaction.content}
                              </p>
                              {interaction.attachments && interaction.attachments.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {interaction.attachments.map((attachment) => (
                                    <a
                                      key={attachment.attachment_id}
                                      href={attachment.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                                    >
                                      <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                        {attachment.file_name}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* New Interaction Form */}
                    <div className="border-t border-gray-100 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
                      <form onSubmit={handleSubmitInteraction} className="space-y-4">
                        <Textarea
                          placeholder="Type your message..."
                          value={newInteraction}
                          onChange={(e) => setNewInteraction(e.target.value)}
                          className="min-h-[120px] resize-none bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        
                        {/* File Upload Section */}
                        {files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            type="submit" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isSubmitting || (!newInteraction.trim() && files.length === 0)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            className="px-3"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                          />
                        </div>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Customer Info */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <div className="border-b border-gray-100 dark:border-gray-700 p-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Customer Details
                      </h2>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-800 flex items-center justify-center border border-purple-200 dark:border-purple-700 flex-shrink-0">
                          <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-lg text-gray-900 dark:text-white truncate">
                            {ticket.customer.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Customer
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 break-all">
                            {ticket.customer.email}
                          </div>
                        </div>
                        {ticket.customer.phone && (
                          <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <Phone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 break-all">
                              {ticket.customer.phone}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tags */}
                {ticket.ticket_tags && ticket.ticket_tags.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="border-b border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Tags
                        </h2>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                          {ticket.ticket_tags.map((tag: any, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                            >
                              {tag.tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 