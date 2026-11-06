'use client';

import React, { useState, useMemo } from 'react';
import { TaskItem, type TaskItemData } from '@/features/tasks/task-item';
import { CreateTaskDialog } from '@/features/tasks/create-task-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, Search, SlidersHorizontal } from 'lucide-react';

interface TaskListViewProps {
  initialTasks: TaskItemData[];
  categories: { id: string; name: string; color: string | null }[];
}

export function TaskListView({ initialTasks, categories }: TaskListViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      // Tab filter
      if (activeTab === 'pending' && task.status !== 'pending') return false;
      if (activeTab === 'in_progress' && task.status !== 'in_progress') return false;
      if (activeTab === 'completed' && task.status !== 'completed') return false;

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [initialTasks, activeTab, priorityFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: initialTasks.length,
      pending: initialTasks.filter((t) => t.status === 'pending').length,
      in_progress: initialTasks.filter((t) => t.status === 'in_progress').length,
      completed: initialTasks.filter((t) => t.status === 'completed').length,
    };
  }, [initialTasks]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tasks & Productivity
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize tasks, subtasks, priorities, and deadlines
          </p>
        </div>

        <CreateTaskDialog categories={categories} />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="all" className="text-xs">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs">
            In Progress ({counts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({counts.completed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            searchQuery
              ? 'No matching tasks'
              : activeTab === 'completed'
              ? 'No completed tasks yet'
              : 'No tasks on your list'
          }
          description={
            searchQuery
              ? `No tasks matched your search query "${searchQuery}".`
              : 'Create a new task to organize your academic assignments and daily priorities.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
