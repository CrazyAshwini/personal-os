'use client';

import React, { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CheckSquare, CheckCircle2, Plus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { updateTaskAction } from '@/features/tasks/actions';

export interface TodayTaskItem {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
}

interface TodayTaskListProps {
  tasks: TodayTaskItem[];
}

export function TodayTaskList({ tasks }: TodayTaskListProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (state, { id, status }: { id: string; status: 'pending' | 'completed' }) =>
      state.map((t) => (t.id === id ? { ...t, status } : t))
  );

  const handleToggle = (task: TodayTaskItem) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    startTransition(async () => {
      setOptimisticTasks({ id: task.id, status: nextStatus });
      await updateTaskAction({
        id: task.id,
        status: nextStatus,
      });
    });
  };

  const pendingCount = optimisticTasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Today&apos;s To-Do List</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {pendingCount} remaining
          </span>
        </div>
        <Link
          href="/productivity"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Manage Tasks
        </Link>
      </div>

      {optimisticTasks.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-card">
          <CheckCircle2 className="h-7 w-7 mx-auto text-primary/40 mb-2" />
          <p className="font-medium text-foreground">All caught up for today!</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">No pending items remaining on your schedule.</p>
          <Link
            href="/productivity"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'mt-3 text-xs h-7 rounded-lg border-border inline-flex items-center',
            })}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add a New Task
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {optimisticTasks.map((task) => {
            const isDone = task.status === 'completed';

            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                  isDone
                    ? 'border-border/60 bg-muted/20 opacity-60'
                    : 'border-border bg-card shadow-xs hover:border-primary/40 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => {}}
                    disabled={isPending}
                    aria-label={`Mark ${task.title} as ${isDone ? 'pending' : 'completed'}`}
                    className="h-4 w-4 rounded border-border text-primary cursor-pointer accent-primary shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium truncate ${
                        isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono capitalize shrink-0 ${
                    task.priority === 'urgent'
                      ? 'border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                      : task.priority === 'high'
                      ? 'border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                      : task.priority === 'medium'
                      ? 'border-primary/30 text-primary bg-primary/10'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {task.priority}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
