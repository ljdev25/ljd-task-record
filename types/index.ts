export type Priority = 'urgent' | 'asap' | 'normal'
export type Status = 'pending' | 'in_progress' | 'done'
export type Role = 'boss' | 'staff'

export interface Task {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: Status
  due_date: string | null
  assigned_to: string
  attachment_url: string | null
  attachment_name: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  task_id: string
  author: string
  content: string
  created_at: string
}
