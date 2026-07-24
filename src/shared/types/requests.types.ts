export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RequestPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type RequestCategory = 'equipamiento' | 'mantenimiento' | 'software' | 'infraestructura' | 'otro';
export type ApprovalRole = 'gerencia' | 'sistemas' | 'administracion';

export interface RequestApproval {
  id: string;
  request_id: string;
  role: ApprovalRole;
  approver_id?: string;
  approver_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  requester_id: string;
  requester_name: string;
  requester_email?: string;
  department?: string;
  location_id?: string;
  location?: { name: string };
  due_date?: string;
  estimated_cost?: number;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  approvals?: RequestApproval[];
  requester?: { full_name: string };
}

export interface RequestFormData {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  department?: string;
  location_id?: string;
  due_date?: string;
  estimated_cost?: number;
  requester_email?: string;
  sendEmail?: boolean;
  emailRecipients?: {
    to: string[];
    cc: string[];
  };
}
