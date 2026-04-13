export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'pending' | 'in-progress' | 'blocked' | 'dispatched' | 'completed' | 'overdue';
export type RelationshipStatus = 'warm' | 'cold' | 'dormant';
export type ProjectStatus = 'active' | 'completed' | 'archived' | 'template';
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'system';
export type BillingStatus = 'pending' | 'paid' | 'overdue';
export type ProjectMemberRole = 'lead' | 'member';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  added_at: string;
  // Joined from profiles
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  next_action?: string | null;
  registry_number?: string | null;
  source?: string | null;
  job_type?: string | null;
  project_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;

  // Optional expanded relational data
  project?: Project;
  contact?: Contact;
  assignee?: Profile;
  interactions?: TaskInteraction[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  progress: number;
  tags: string[];
  status: ProjectStatus;
  priority?: Priority;
  team: { name: string; avatar: string }[];
  contact_id?: string | null;
  project_number?: string | null;
  assigned_lead?: string | null; // legacy text field
  assigned_user_id?: string | null;
  due_date?: string | null;
  category?: string | null;
  estimated_budget?: number | null;
  created_at: string;
  updated_at: string;

  // Optional relational data
  tasks?: Task[];
  transactions?: BillingTransaction[];
  interactions?: ProjectInteraction[];
  contact?: Contact;
  assignee?: Profile;
  members?: ProjectMember[];
}

export interface ProjectInteraction {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  created_at: string;
}

export interface TaskInteraction {
  id: string;
  user_id: string;
  task_id: string;
  content: string;
  created_at: string;
  // Optional expanded data
  user?: Profile;
}

export interface Attachment {
  id: string;
  user_id: string;
  task_id?: string | null;
  project_id?: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
}

export type NotificationType = 'assignment' | 'mention' | 'status' | 'comment' | 'system';
export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  entity_type?: 'task' | 'project' | null;
  entity_id?: string | null;
  read: boolean;
  created_at: string;
  
  // Optional expanded
  actor?: Profile;
}

export interface Settings {
  id: string;
  user_id: string;
  theme: string;
  email_notifications: boolean;
  crm_name: string;
}

export type Role = 'admin' | 'member';

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role: Role;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  avatar?: string | null;
  status: RelationshipStatus;
  last_interaction?: string | null;
  next_step?: string | null;
  interactions: number;
  rank?: string | null;
  context?: string | null;
  category?: string | null;
  // New CRM fields
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  address?: string | null;
  linkedin?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInteraction {
  id: string;
  user_id: string;
  contact_id: string;
  type: InteractionType;
  note?: string | null;
  interacted_at: string;
  created_at: string;
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  project_id: string;
  description: string;
  amount: number;
  status: BillingStatus;
  date: string; // ISO date format YYYY-MM-DD
  created_at: string;
}
