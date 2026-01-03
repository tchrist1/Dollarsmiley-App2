import { supabase } from './supabase';

export interface FileAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'file';
}

export interface UploadedAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'file';
}

export async function uploadFileAttachment(
  userId: string,
  file: FileAttachment
): Promise<{ url: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${timestamp}_${file.name}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, blob, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (error: any) {
    console.error('File upload error:', error);
    return { url: '', error: error.message };
  }
}

export async function sendFileMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  attachment: UploadedAttachment,
  messageText?: string
): Promise<{ success: boolean; error?: string; message?: any }> {
  try {
    const messageType = attachment.type === 'image' ? 'image' : 'file';
    const content =
      messageText ||
      (attachment.type === 'image' ? '📷 Image' : `📎 ${attachment.name}`);

    const attachmentData = [
      {
        url: attachment.url,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        type: attachment.type,
      },
    ];

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        attachments: JSON.stringify(attachmentData),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Send file message error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: data };
  } catch (error: any) {
    console.error('Send file message error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFileAttachment(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('attachments, sender_id, message_type')
      .eq('id', messageId)
      .single();

    if (fetchError || !message || message.sender_id !== userId) {
      return false;
    }

    if (message.attachments) {
      const attachments = JSON.parse(message.attachments as any);
      for (const attachment of attachments) {
        if (attachment.url) {
          const urlParts = attachment.url.split('/chat-attachments/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('chat-attachments').remove([filePath]);
          }
        }
      }
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) {
      console.error('Delete file message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete file message error:', error);
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
}

export function getMimeTypeFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',

    // Audio/Video
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',

    // Others
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

export async function getConversationAttachmentStats(
  conversationId: string
): Promise<{
  totalFiles: number;
  totalImages: number;
  totalDocuments: number;
  totalSizeMB: number;
}> {
  try {
    const { data, error } = await supabase.rpc(
      'get_conversation_attachment_stats',
      { p_conversation_id: conversationId }
    );

    if (error) {
      console.error('Get attachment stats error:', error);
      return { totalFiles: 0, totalImages: 0, totalDocuments: 0, totalSizeMB: 0 };
    }

    if (data && data.length > 0) {
      const stats = data[0];
      return {
        totalFiles: Number(stats.total_files) || 0,
        totalImages: Number(stats.total_images) || 0,
        totalDocuments: Number(stats.total_documents) || 0,
        totalSizeMB: Number(stats.total_size_mb) || 0,
      };
    }

    return { totalFiles: 0, totalImages: 0, totalDocuments: 0, totalSizeMB: 0 };
  } catch (error) {
    console.error('Get attachment stats error:', error);
    return { totalFiles: 0, totalImages: 0, totalDocuments: 0, totalSizeMB: 0 };
  }
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

export function validateFileType(
  mimeType: string,
  allowedTypes: string[] = []
): boolean {
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some((type) => mimeType.includes(type));
}

export async function cleanupOrphanedAttachments(): Promise<number> {
  try {
    await supabase.rpc('cleanup_orphaned_attachments');
    return 0;
  } catch (error) {
    console.error('Cleanup orphaned attachments error:', error);
    return -1;
  }
}

export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'Archive';
  if (mimeType.includes('text')) return 'Text';
  return 'File';
}
