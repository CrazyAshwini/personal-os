'use client';

import React, { useState, useTransition } from 'react';
import { format, subDays } from 'date-fns';
import {
  Activity,
  Check,
  Plus,
  Trash2,
  Target,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createHabitAction,
  toggleHabitDayAction,
  deleteHabitAction,
  createGoalAction,
  updateGoalProgressAction,
  deleteGoalAction,
} from '@/features/personal-life/actions';
import type { Database } from '@/types/database';

type HabitRow = Database['public']['Tables']['habits']['Row'];
type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];

interface HabitsViewProps {
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  goals: GoalRow[];
}

export function HabitsView({ habits, habitLogs, goals }: HabitsViewProps) {
  const [isPending, startTransition] = useTransition();

  // Habit Dialog State
  const [habitOpen, setHabitOpen] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [targetDays, setTargetDays] = useState(7);
  const [habitColor, setHabitColor] = useState('#10b981');

  // Goal Dialog State
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState<
    'academic' | 'career' | 'health' | 'financial' | 'personal'
  >('personal');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Last 7 days for the weekly tracker
  const today = new Date();
  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    return {
      dateObj: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'),
      dayNum: format(d, 'd'),
    };
  });

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    startTransition(async () => {
      await createHabitAction({
        name: habitName,
        description: habitDesc || null,
        frequency: 'daily',
        targetDaysPerWeek: targetDays,
        color: habitColor,
        icon: 'Activity',
      });
      setHabitOpen(false);
      setHabitName('');
      setHabitDesc('');
    });
  };

  const handleToggleDay = (habitId: string, completedDate: string) => {
    startTransition(async () => {
      await toggleHabitDayAction({
        habitId,
        completedDate,
      });
    });
  };

  const handleDeleteHabit = (id: string) => {
    startTransition(async () => {
      await deleteHabitAction(id);
    });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    startTransition(async () => {
      await createGoalAction({
        title: goalTitle,
        description: goalDesc || null,
        category: goalCategory,
        targetDate: goalTargetDate || null,
        progressPercentage: 0,
      });
      setGoalOpen(false);
      setGoalTitle('');
      setGoalDesc('');
    });
  };

  const handleUpdateGoalProgress = (goalId: string, current: number, delta: number) => {
    const nextVal = Math.min(100, Math.max(0, current + delta));
    startTransition(async () => {
      await updateGoalProgressAction(goalId, nextVal);
    });
  };

  const handleDeleteGoal = (id: string) => {
    startTransition(async () => {
      await deleteGoalAction(id);
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. HABITS SECTION */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Daily Habit Tracker
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build positive momentum with 7-day streak consistency tracking.
            </p>
          </div>

          <Dialog open={habitOpen} onOpenChange={setHabitOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Habit
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Create Daily Habit</DialogTitle>
                <DialogDescription className="text-xs">
                  Define a recurring behavior you want to track consistently.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateHabit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="h-name" className="text-xs">Habit Name *</Label>
                  <Input
                    id="h-name"
                    required
                    placeholder="e.g. Read 20 pages, Gym workout, Drink 3L water"
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="h-desc" className="text-xs">Description / Routine</Label>
                  <Input
                    id="h-desc"
                    placeholder="e.g. Morning 7:00 AM before classes"
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="h-target" className="text-xs">Target Days/Week</Label>
                    <select
                      id="h-target"
                      value={targetDays}
                      onChange={(e) => setTargetDays(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
                    >
                      {[7, 6, 5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} days / week
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="h-color" className="text-xs">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="h-color"
                        type="color"
                        value={habitColor}
                        onChange={(e) => setHabitColor(e.target.value)}
                        className="h-8 w-12 rounded border border-border cursor-pointer p-0.5 bg-background"
                      />
                      <span className="text-xs font-mono text-muted-foreground">{habitColor}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHabitOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !habitName.trim()}
                    className="h-8 text-xs"
                  >
                    {isPending ? 'Saving...' : 'Save Habit'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {habits.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p>No habits tracked yet. Click &ldquo;Add Habit&rdquo; to build daily routines.</p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3 px-4 text-left font-semibold">Habit</th>
                    {pastDays.map((d, i) => (
                      <th key={d.dateStr} className="py-3 px-2 text-center font-medium w-12">
                        <span className="block text-[10px] text-muted-foreground uppercase">
                          {d.dayName}
                        </span>
                        <span
                          className={`inline-block text-[11px] font-bold rounded-full h-5 w-5 leading-5 mt-0.5 ${
                            i === 6
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {d.dayNum}
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center font-semibold w-20">Rate</th>
                    <th className="py-3 px-3 text-right font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {habits.map((habit) => {
                    const habitCompletions = pastDays.filter((d) =>
                      habitLogs.some(
                        (l) => l.habit_id === habit.id && l.completed_date === d.dateStr
                      )
                    ).length;

                    return (
                      <tr key={habit.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: habit.color || '#10b981' }}
                            />
                            <div>
                              <p className="font-semibold text-foreground">{habit.name}</p>
                              {habit.description && (
                                <p className="text-[10px] text-muted-foreground">
                                  {habit.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {pastDays.map((d) => {
                          const isDone = habitLogs.some(
                            (l) => l.habit_id === habit.id && l.completed_date === d.dateStr
                          );

                          return (
                            <td key={d.dateStr} className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleDay(habit.id, d.dateStr)}
                                disabled={isPending}
                                className={`h-7 w-7 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                    : 'border-border/80 hover:border-emerald-500/50 bg-background'
                                }`}
                                title={`${habit.name} on ${d.dateStr}`}
                              >
                                {isDone && <Check className="h-4 w-4" />}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            {habitCompletions}/7
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHabit(habit.id)}
                            disabled={isPending}
                            title="Delete habit"
                            className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. GOALS SECTION */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              Strategic Goals & Milestones
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Long-term personal, academic, and health objectives.
            </p>
          </div>

          <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Goal
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Create Strategic Goal</DialogTitle>
                <DialogDescription className="text-xs">
                  Set target milestones and track completion percentage.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-title" className="text-xs">Goal Title *</Label>
                  <Input
                    id="g-title"
                    required
                    placeholder="e.g. Master Rust, Score 9.0 GPA, Run 10km Marathon"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="g-cat" className="text-xs">Category</Label>
                    <select
                      id="g-cat"
                      value={goalCategory}
                      onChange={(e) =>
                        setGoalCategory(
                          e.target.value as
                            | 'academic'
                            | 'career'
                            | 'health'
                            | 'financial'
                            | 'personal'
                        )
                      }
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
                    >
                      <option value="academic">Academic</option>
                      <option value="career">Career / Technical</option>
                      <option value="health">Health & Fitness</option>
                      <option value="financial">Financial</option>
                      <option value="personal">Personal Growth</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="g-target" className="text-xs">Target Date</Label>
                    <Input
                      id="g-target"
                      type="date"
                      value={goalTargetDate}
                      onChange={(e) => setGoalTargetDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="g-desc" className="text-xs">Description / Key Results</Label>
                  <Input
                    id="g-desc"
                    placeholder="Optional notes or sub-milestones"
                    value={goalDesc}
                    onChange={(e) => setGoalDesc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGoalOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !goalTitle.trim()}
                    className="h-8 text-xs"
                  >
                    {isPending ? 'Saving...' : 'Save Goal'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p>No goals set yet. Click &ldquo;Add Goal&rdquo; to track long-term milestones.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const isCompleted = goal.progress_percentage >= 100;
              return (
                <Card
                  key={goal.id}
                  className={`hover:border-primary/40 transition-colors flex flex-col justify-between ${
                    isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <CardTitle className="text-sm font-semibold">
                            {goal.title}
                          </CardTitle>
                          {isCompleted && (
                            <Award className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        {goal.description && (
                          <CardDescription className="text-[11px] mt-0.5 line-clamp-2">
                            {goal.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {goal.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold text-foreground font-mono">
                          {goal.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-6 px-1.5 text-[10px]"
                          disabled={isPending || goal.progress_percentage <= 0}
                          onClick={() =>
                            handleUpdateGoalProgress(goal.id, goal.progress_percentage, -10)
                          }
                        >
                          -10%
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-6 px-1.5 text-[10px]"
                          disabled={isPending || goal.progress_percentage >= 100}
                          onClick={() =>
                            handleUpdateGoalProgress(goal.id, goal.progress_percentage, 10)
                          }
                        >
                          +10%
                        </Button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        disabled={isPending}
                        title="Delete goal"
                        className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
