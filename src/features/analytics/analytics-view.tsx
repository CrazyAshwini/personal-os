'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  GraduationCap,
  Timer,
  CheckSquare,
  Activity,
  BookOpen,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubjectAttendanceStat {
  name: string;
  percentage: number;
  present: number;
  conducted: number;
}

interface FocusDayStat {
  day: string;
  minutes: number;
}

interface TaskStatusStat {
  name: string;
  value: number;
  color: string;
}

interface HabitStat {
  name: string;
  rate: number;
  completions: number;
}

interface AnalyticsViewProps {
  attendanceData: SubjectAttendanceStat[];
  focusTrend: FocusDayStat[];
  taskStatusData: TaskStatusStat[];
  habitStats: HabitStat[];
  booksCount: { reading: number; completed: number; totalPages: number };
  financeData: { monthlySpend: number; currency: string; categories: Record<string, number> };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AnalyticsView({
  attendanceData,
  focusTrend,
  taskStatusData,
  habitStats,
  booksCount,
  financeData,
}: AnalyticsViewProps) {
  const totalFocusMinutes = focusTrend.reduce((acc, f) => acc + f.minutes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Global Performance Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-module telemetry: academic attendance, study velocity, habits, and financial trends.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono">
          Unified Analytics Engine
        </Badge>
      </div>

      {/* Top 4 Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Focus Logged
            </CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {Math.round(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Recorded in recent sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Courses Tracked
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {attendanceData.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Semester curriculum courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Habits
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {habitStats.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Consistency streak routines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Monthly Spending
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {financeData.currency === 'INR' ? '₹' : '$'}
              {financeData.monthlySpend.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Expense Manager sync
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Academic Attendance Bar Chart & Study Focus Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Course */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              Course Attendance Rates (%)
            </CardTitle>
            <CardDescription className="text-xs">
              Derived attendance percentages with 75% minimum academic threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {attendanceData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">
                No course sessions logged yet.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(val: unknown) => [`${val}%`, 'Attendance']}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Velocity / Focus Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-500" />
              Focus Study Velocity (Minutes/Day)
            </CardTitle>
            <CardDescription className="text-xs">
              Timestamp-derived Pomodoro focus volume over recent study days.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {focusTrend.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">
                No focus sessions completed yet.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={focusTrend}>
                    <defs>
                      <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="m" />
                    <Tooltip
                      formatter={(val: unknown) => [`${val} mins`, 'Study Time']}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#f97316"
                      fillOpacity={1}
                      fill="url(#focusGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Tasks Status Pie Chart & Habit Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Velocity Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-500" />
              Task Execution Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Pending vs completed vs in-progress productivity items.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {taskStatusData.every((t) => t.value === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-16">
                No tasks available.
              </p>
            ) : (
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habits Consistency List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Habit Consistency Rates (7-Day Rolling)
            </CardTitle>
            <CardDescription className="text-xs">
              Weekly completion ratio per active habit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {habitStats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">
                No habits logged yet.
              </p>
            ) : (
              habitStats.map((h) => (
                <div key={h.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {h.completions}/7 ({h.rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${h.rate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Reading & Knowledge Vault Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
              Reading Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {booksCount.reading}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Currently on shelf
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              Finished Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {booksCount.completed}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Read and completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
              Total Pages Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {booksCount.totalPages.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Cumulative reading volume
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
