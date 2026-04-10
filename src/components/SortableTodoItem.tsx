import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Calendar as CalendarIcon, Hash, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export function SortableTodoItem({ todo, toggleTodo, deleteTodo, activeTab, group, priorityColors, businesses }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const businessName = businesses?.find((b: any) => b.id === todo.project)?.name || todo.project;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "group flex flex-col gap-3 p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] transition-all hover:border-[#2665fd] cursor-grab active:cursor-grabbing",
        todo.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id, todo.completed); }}
          className={cn(
            "mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            todo.completed 
              ? "bg-gray-400 border-gray-400 text-white" 
              : cn("border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800", priorityColors[todo.priority])
          )}
        >
          {todo.completed && <CheckCircle2 className="w-3 h-3" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium text-[#202020] dark:text-[#EBE9ED]", todo.completed && "line-through text-[#808080]")}>
            {todo.text}
          </p>
        </div>

        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} 
          className="opacity-0 group-hover:opacity-100 p-1.5 text-[#808080] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[8px] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-[#F0F0F0] dark:border-[#2E2E2E]">
        {todo.dueDate && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[6px] bg-[#F7F7F5] dark:bg-[#202020]",
            todo.dueDate === format(new Date(), 'yyyy-MM-dd') ? "text-green-600 dark:text-green-500" : "text-[#808080]"
          )}>
            <CalendarIcon className="w-3 h-3" />
            {todo.dueDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(parseISO(todo.dueDate), 'MMM d')}
            {todo.dueTime && ` ${todo.dueTime}`}
          </span>
        )}
        {activeTab !== group && todo.project && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#808080] flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#F7F7F5] dark:bg-[#202020]">
            <Hash className="w-3 h-3" /> {businessName}
          </span>
        )}
      </div>
    </div>
  );
}
