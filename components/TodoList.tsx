'use client';

import { useEffect, useState } from 'react';
import { db, COLLECTIONS } from '@/lib/cocobase';
import TodoItem from './TodoItem';
import type { Todo } from '@/types/todo';

interface TodoListProps {
  userId: string;
}

export default function TodoList({ userId }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchTodos();
    
    // Optimistic add - add todo immediately to UI
    const handleTodoAdded = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTodo = customEvent.detail;
      setTodos(prev => [{
        id: `temp-${Date.now()}`, // Temporary ID
        ...newTodo
      }, ...prev]);
    };
    
    // Replace temp todo with real one from server
    const handleTodoCreated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const serverTodo = customEvent.detail;
      setTodos(prev => prev.map(todo => 
        todo.id.toString().startsWith('temp-') && todo.title === serverTodo.data.title
          ? { id: serverTodo.id, ...serverTodo.data }
          : todo
      ));
    };
    
    // Remove failed todo
    const handleTodoAddFailed = (e: Event) => {
      const customEvent = e as CustomEvent;
      const failedTodo = customEvent.detail;
      setTodos(prev => prev.filter(todo => 
        !(todo.id.toString().startsWith('temp-') && todo.title === failedTodo.title)
      ));
    };
    
    window.addEventListener('todoAdded', handleTodoAdded as EventListener);
    window.addEventListener('todoCreated', handleTodoCreated as EventListener);
    window.addEventListener('todoAddFailed', handleTodoAddFailed as EventListener);
    
    return () => {
      window.removeEventListener('todoAdded', handleTodoAdded as EventListener);
      window.removeEventListener('todoCreated', handleTodoCreated as EventListener);
      window.removeEventListener('todoAddFailed', handleTodoAddFailed as EventListener);
    };
  }, [userId]);

  const fetchTodos = async () => {
    try {
      const allTodos = await db.listDocuments(COLLECTIONS.TODOS);
      const userTodos = allTodos
        .filter((todo: any) => todo.data.userId === userId)
        .map((todo: any) => ({
          id: todo.id,
          ...todo.data
        })) as unknown as Todo[];
      setTodos(userTodos.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    // Optimistic update - update UI immediately
    setTodos(prev => prev.map(t => 
      t.id === todo.id 
        ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
        : t
    ));
    
    window.dispatchEvent(new Event('todoUpdated'));
    
    try {
      await db.updateDocument(COLLECTIONS.TODOS, todo.id, {
        completed: !todo.completed,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert on error
      setTodos(prev => prev.map(t => 
        t.id === todo.id 
          ? { ...t, completed: todo.completed }
          : t
      ));
      alert('Failed to update todo. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    // Store the todo in case we need to restore it
    const deletedTodo = todos.find(t => t.id === id);
    
    // Optimistic delete - remove from UI immediately
    setTodos(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new Event('todoUpdated'));
    
    try {
      await db.deleteDocument(COLLECTIONS.TODOS, id);
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Revert on error
      if (deletedTodo) {
        setTodos(prev => [deletedTodo, ...prev].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
      alert('Failed to delete todo. Please try again.');
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center card-shadow-lg">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mx-auto mb-4"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-14 w-14 border-4 border-blue-600 opacity-20 mx-auto"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white card-shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-90">Total</span>
            <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-4xl font-bold">{stats.total}</div>
          <div className="text-xs opacity-75 mt-1">Tasks</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white card-shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-90">Active</span>
            <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-4xl font-bold">{stats.active}</div>
          <div className="text-xs opacity-75 mt-1">In Progress</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white card-shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-90">Done</span>
            <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-4xl font-bold">{stats.completed}</div>
          <div className="text-xs opacity-75 mt-1">{completionRate}% Complete</div>
        </div>
      </div>

      {/* Task List Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 card-shadow-lg overflow-hidden">
        {/* Filter Header */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Tasks</h3>
            <div className="flex gap-2">
              {(['all', 'active', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task Items */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {filter === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {filter === 'all' && 'Start by creating your first task using the form on the left'}
              {filter === 'active' && 'All your tasks are completed! Great job!'}
              {filter === 'completed' && 'Complete some tasks to see them here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TodoItem
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
