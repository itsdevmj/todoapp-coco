export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  userId: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}