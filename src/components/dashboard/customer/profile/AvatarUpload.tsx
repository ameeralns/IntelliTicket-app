"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (url: string | null) => void;
}

export default function AvatarUpload({ currentAvatarUrl, onAvatarUpdate }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClientComponentClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session found');

      // Create a simple filename with timestamp to ensure uniqueness
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;

      console.log('Attempting to upload:', fileName);

      // Upload new file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      // Update the customer record
      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: publicUrl })
        .eq('customer_id', session.user.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        throw updateError;
      }

      // If we got here, upload was successful, so we can remove the old avatar
      if (currentAvatarUrl) {
        const oldFileName = currentAvatarUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([oldFileName])
            .catch(error => {
              // Just log the error but don't fail the operation
              console.warn('Error removing old avatar:', error);
            });
        }
      }

      onAvatarUpdate(publicUrl);
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error('Full error details:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session found');

      const fileName = currentAvatarUrl.split('/').pop();
      if (fileName) {
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([fileName]);
          
        if (removeError) {
          console.error('Error removing file:', removeError);
          throw removeError;
        }
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: null })
        .eq('customer_id', session.user.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        throw updateError;
      }

      onAvatarUpdate(null);
      toast.success('Avatar removed successfully');
    } catch (error: any) {
      console.error('Full error details:', error);
      toast.error(error.message || 'Failed to remove avatar');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-32">
        {currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt="Avatar"
            width={128}
            height={128}
            className="rounded-full object-cover"
            unoptimized // Add this to prevent Next.js image optimization issues with Supabase URLs
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-4xl text-gray-400">
              {/* Default avatar icon or first letter of name */}
              ?
            </span>
          </div>
        )}
        
        {currentAvatarUrl && (
          <button
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            title="Remove avatar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Upload Avatar'}
        </div>
      </label>
    </div>
  );
} 