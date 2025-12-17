import { supabase } from './supabase';

export interface RejectedRequest {
  id: string;
  provider_id: string;
  verification_type: 'Identity' | 'Business' | 'Background' | 'All';
  status: 'Rejected';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  documents?: VerificationDocument[];
}

export interface VerificationDocument {
  id: string;
  user_id: string;
  request_id: string | null;
  document_type: string;
  document_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface ResubmissionData {
  requestId: string;
  newDocuments: Array<{
    document_type: string;
    document_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }>;
  notes?: string;
}

export async function getRejectedRequests(userId: string): Promise<RejectedRequest[]> {
  try {
    const { data, error } = await supabase
      .from('provider_verification_requests')
      .select(`
        *,
        verification_documents (*)
      `)
      .eq('provider_id', userId)
      .eq('status', 'Rejected')
      .order('reviewed_at', { ascending: false });

    if (error) throw error;

    return (data || []) as RejectedRequest[];
  } catch (error) {
    console.error('Error fetching rejected requests:', error);
    return [];
  }
}

export async function getRejectedRequestDetails(
  requestId: string
): Promise<RejectedRequest | null> {
  try {
    const { data, error } = await supabase
      .from('provider_verification_requests')
      .select(`
        *,
        verification_documents (*)
      `)
      .eq('id', requestId)
      .eq('status', 'Rejected')
      .single();

    if (error) throw error;

    return data as RejectedRequest;
  } catch (error) {
    console.error('Error fetching rejected request details:', error);
    return null;
  }
}

export async function archiveOldDocuments(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('verification_documents')
      .update({
        archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('request_id', requestId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error archiving old documents:', error);
    return false;
  }
}

export async function createResubmissionRequest(
  oldRequestId: string,
  userId: string,
  verificationType: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const { data: newRequest, error: requestError } = await supabase
      .from('provider_verification_requests')
      .insert({
        provider_id: userId,
        verification_type: verificationType,
        status: 'Pending',
        admin_notes: `Resubmission of request ${oldRequestId}`,
      })
      .select()
      .single();

    if (requestError) throw requestError;

    await supabase
      .from('provider_verification_requests')
      .update({
        admin_notes: `Superseded by resubmission ${newRequest.id}`
      })
      .eq('id', oldRequestId);

    return { success: true, requestId: newRequest.id };
  } catch (error: any) {
    console.error('Error creating resubmission request:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadResubmissionDocuments(
  requestId: string,
  userId: string,
  documents: Array<{
    document_type: string;
    document_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const documentsToInsert = documents.map((doc) => ({
      user_id: userId,
      request_id: requestId,
      document_type: doc.document_type,
      document_url: doc.document_url,
      file_name: doc.file_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
    }));

    const { error } = await supabase
      .from('verification_documents')
      .insert(documentsToInsert);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error uploading resubmission documents:', error);
    return { success: false, error: error.message };
  }
}

export async function submitResubmission(
  data: ResubmissionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const oldRequest = await getRejectedRequestDetails(data.requestId);

    if (!oldRequest) {
      return { success: false, error: 'Original request not found' };
    }

    const createResult = await createResubmissionRequest(
      data.requestId,
      user.id,
      oldRequest.verification_type
    );

    if (!createResult.success || !createResult.requestId) {
      return { success: false, error: createResult.error };
    }

    const uploadResult = await uploadResubmissionDocuments(
      createResult.requestId,
      user.id,
      data.newDocuments
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    await archiveOldDocuments(data.requestId);

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'verification',
      title: 'Resubmission Received',
      message: `Your ${oldRequest.verification_type} verification has been resubmitted and is awaiting review.`,
      data: {
        request_id: createResult.requestId,
        verification_type: oldRequest.verification_type,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting resubmission:', error);
    return { success: false, error: error.message };
  }
}

export async function getResubmissionHistory(
  originalRequestId: string
): Promise<RejectedRequest[]> {
  try {
    const { data: originalRequest } = await supabase
      .from('provider_verification_requests')
      .select('provider_id, verification_type')
      .eq('id', originalRequestId)
      .single();

    if (!originalRequest) return [];

    const { data, error } = await supabase
      .from('provider_verification_requests')
      .select(`
        *,
        verification_documents (*)
      `)
      .eq('provider_id', originalRequest.provider_id)
      .eq('verification_type', originalRequest.verification_type)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    return (data || []) as RejectedRequest[];
  } catch (error) {
    console.error('Error fetching resubmission history:', error);
    return [];
  }
}

export async function canResubmit(requestId: string): Promise<{
  canResubmit: boolean;
  reason?: string;
}> {
  try {
    const { data: request, error } = await supabase
      .from('provider_verification_requests')
      .select('status, provider_id, verification_type')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    if (request.status !== 'Rejected') {
      return {
        canResubmit: false,
        reason: 'Only rejected requests can be resubmitted',
      };
    }

    const { data: existingPending } = await supabase
      .from('provider_verification_requests')
      .select('id')
      .eq('provider_id', request.provider_id)
      .eq('verification_type', request.verification_type)
      .in('status', ['Pending', 'UnderReview'])
      .limit(1)
      .single();

    if (existingPending) {
      return {
        canResubmit: false,
        reason: 'You already have a pending resubmission for this verification type',
      };
    }

    return { canResubmit: true };
  } catch (error) {
    console.error('Error checking resubmission eligibility:', error);
    return {
      canResubmit: false,
      reason: 'Unable to verify eligibility',
    };
  }
}

export function getRejectionReasonSuggestions(rejectionReason: string | null): string[] {
  if (!rejectionReason) return [];

  const suggestions: string[] = [];
  const reason = rejectionReason.toLowerCase();

  if (reason.includes('blur') || reason.includes('unclear') || reason.includes('quality')) {
    suggestions.push('Ensure documents are clear and in focus');
    suggestions.push('Use good lighting when taking photos');
    suggestions.push('Avoid shadows and glare');
  }

  if (reason.includes('expire') || reason.includes('old') || reason.includes('valid')) {
    suggestions.push('Upload current, non-expired documents');
    suggestions.push('Check expiration dates before uploading');
  }

  if (reason.includes('complete') || reason.includes('missing') || reason.includes('partial')) {
    suggestions.push('Include all required pages');
    suggestions.push('Upload front and back of documents');
    suggestions.push('Ensure no information is cut off');
  }

  if (reason.includes('match') || reason.includes('name') || reason.includes('different')) {
    suggestions.push('Ensure name matches your profile');
    suggestions.push('Use documents in your legal name');
  }

  if (reason.includes('format') || reason.includes('type') || reason.includes('file')) {
    suggestions.push('Upload supported file types (JPG, PNG, PDF)');
    suggestions.push('Ensure files are not corrupted');
  }

  if (suggestions.length === 0) {
    suggestions.push('Review the rejection reason carefully');
    suggestions.push('Address all issues mentioned');
    suggestions.push('Upload clear, complete documents');
  }

  return suggestions;
}

export function getDocumentTypeLabel(documentType: string): string {
  const labels: Record<string, string> = {
    'id_front': 'ID Front',
    'id_back': 'ID Back',
    'selfie': 'Selfie',
    'business_license': 'Business License',
    'business_registration': 'Business Registration',
    'tax_id': 'Tax ID',
    'proof_of_address': 'Proof of Address',
    'background_check': 'Background Check',
    'insurance': 'Insurance Certificate',
    'certification': 'Professional Certification',
  };

  return labels[documentType] || documentType;
}

export function getRequiredDocuments(verificationType: string): string[] {
  switch (verificationType) {
    case 'Identity':
      return ['id_front', 'id_back', 'selfie'];
    case 'Business':
      return ['business_license', 'tax_id', 'proof_of_address'];
    case 'Background':
      return ['background_check', 'insurance'];
    case 'All':
      return [
        'id_front',
        'id_back',
        'selfie',
        'business_license',
        'tax_id',
        'proof_of_address',
        'background_check',
      ];
    default:
      return [];
  }
}

export async function getDocumentUploadUrl(
  userId: string,
  fileName: string,
  fileType: string
): Promise<{ url: string; path: string } | null> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `verification-documents/${userId}/${timestamp}_${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return { url: data.signedUrl, path };
  } catch (error) {
    console.error('Error getting upload URL:', error);
    return null;
  }
}

export async function getDocumentPublicUrl(path: string): Promise<string | null> {
  try {
    const { data } = supabase.storage.from('documents').getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return null;
  }
}
