'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateTaskAction, deleteTaskAction, toggleSubtaskAction } from '@/features/tasks/actions';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export interface TaskItemData {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  category?: { id: string; name: string; color: string | null } | null;
  subtasks?: { id: string; title: string; is_completed: boolean }[];
}

export function TaskItem({ task }: { task: TaskItemData }) {
  const [isPending, startTransition] = useTransition();
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  const isCompleted = task.status === 'completed';

  const handleToggleCompleted = () => {
    startTransition(async () => {
      await updateTaskAction({
        id: task.id,
        status: isCompleted ? 'pending' : 'completed',
      });
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      startTransition(async () => {
        await deleteTaskAction(task.id);
      });
    }
  };

  const handleToggleSubtask = (subtaskId: string, currentCompleted: boolean) => {
    startTransition(async () => {
      await toggleSubtaskAction(subtaskId, !currentCompleted);
    });
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    high: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    urgent: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.is_completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div
      className={`group rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-xs ${
        isCompleted ? 'opacity-65' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggleCompleted}
            disabled={isPending}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold text-foreground truncate ${
                isCompleted ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {task.title}
            </h3>

            <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0 ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>

            {task.category && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${task.category.color}15`,
                  color: task.category.color || '#3b82f6',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: task.category.color || '#3b82f6' }}
                />
                {task.category.name}
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {task.due_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}

            {totalSubtasks > 0 && (
              <button
                type="button"
                onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {subtasksExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <span>
                  {completedSubtasks}/{totalSubtasks} subtasks
                </span>
              </button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      {/* Subtasks Accordion */}
      {subtasksExpanded && totalSubtasks > 0 && (
        <div className="mt-3 pl-7 pt-2 border-t border-border/50 space-y-2">
          {task.subtasks?.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2">
              <Checkbox
                checked={subtask.is_completed}
                onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                disabled={isPending}
                className="size-3.5"
              />
              <span
                className={`text-xs ${
                  subtask.is_completed
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
                }`}
              >
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
