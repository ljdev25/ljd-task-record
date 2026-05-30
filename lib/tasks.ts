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
