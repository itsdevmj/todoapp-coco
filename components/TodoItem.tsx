'use client';

import type { Todo } from '@/types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const priorityColors = {
    low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`p-5 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all group ${
      todo.completed ? 'bg-gray-50/50 dark:bg-gray-700/20' : ''
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo)}
            className="h-5 w-5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all hover:scale-110"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-white transition-all ${
              todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
            }`}>
              {todo.title}
            </h3>
          </div>
          
          {todo.description && (
            <p className={`text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed ${
              todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
            }`}>
              {todo.description}
            </p>
          )}
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${priorityColors[todo.priority]}`}>
              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} priority
            </span>
            
            <button
              onClick={() => onDelete(todo.id)}
              className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-all text-sm font-semibold opacity-0 group-hover:opacity-100 hover:scale-110"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}