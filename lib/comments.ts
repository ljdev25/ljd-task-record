import { supabase } from '@/lib/supabase'
import type { Comment } from '@/types'

export async function getComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Comment[]
}

export async function addComment(
  taskId: string,
  author: string,
  content: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, author, content })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Comment
}

export async function getAllComments(): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Comment[]
}
