import { supabase } from '@/lib/supabase'
import type { Task, Priority, Status } from '@/types'

export interface TaskInput {
  title: string
  description: string | null
  priority: Priority
  status: Status
  due_date: string | null
  assigned_to: string
  attachment_url: string | null
  attachment_name: string | null
  created_by: string
}

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Task[]
}

export async function getStaffTasks(username: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', username)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Task[]
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Task
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateTaskStatus(id: string, status: Status): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Task
}

export async function updateTaskAttachment(
  id: string,
  attachmentUrl: string | null,
  attachmentName: string | null,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ attachment_url: attachmentUrl, attachment_name: attachmentName })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Task
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('due_date', date)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Task[]
}

export async function getTasksByMonth(year: number, month: number): Promise<Task[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('due_date', start)
    .lte('due_date', end)
    .order('due_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Task[]
}

export async function searchAndFilterTasks(
  keyword: string,
  priority: Priority | 'all',
  status: Status | 'all',
): Promise<Task[]> {
  let query = supabase.from('tasks').select('*')
  if (keyword.trim()) {
    query = query.ilike('title', `%${keyword.trim()}%`)
  }
  if (priority !== 'all') {
    query = query.eq('priority', priority)
  }
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  query = query.order('due_date', { ascending: true })
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Task[]
}
