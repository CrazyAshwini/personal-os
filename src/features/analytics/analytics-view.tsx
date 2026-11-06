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

const SAGE_PALETTE = ['#526653', '#788D79', '#91A58F', '#A3B899', '#D97706'];

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Global Performance Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-module telemetry: academic attendance, study velocity, habits, and financial trends.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono border-border">
          Unified Analytics Engine
        </Badge>
      </div>

      {/* Top 4 Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Focus Logged
            </CardTitle>
            <Timer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {Math.round(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Recorded in recent sessions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Courses Tracked
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {attendanceData.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Semester curriculum courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Habits
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {habitStats.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Consistency streak routines
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Monthly Spending
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
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
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Course Attendance Rates (%)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
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
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(val: unknown) => [`${val}%`, 'Attendance']}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        color: 'var(--popover-foreground)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="percentage" fill="#526653" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Velocity / Focus Time */}
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Timer className="h-4 w-4 text-primary" />
              Focus Study Velocity (Minutes/Day)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
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
                      <linearGradient id="focusSageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#526653" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#526653" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="m" />
                    <Tooltip
                      formatter={(val: unknown) => [`${val} mins`, 'Study Time']}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        color: 'var(--popover-foreground)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#526653"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#focusSageGrad)"
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
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <CheckSquare className="h-4 w-4 text-primary" />
              Task Execution Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
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
                          fill={entry.color || SAGE_PALETTE[index % SAGE_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        color: 'var(--popover-foreground)',
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
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Habit Consistency Rates (7-Day Rolling)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Weekly completion ratio per active habit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-0">
            {habitStats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">
                No habits logged yet.
              </p>
            ) : (
              habitStats.map((h) => (
                <div key={h.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {h.completions}/7 ({h.rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
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
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 font-mono">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Reading Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {booksCount.reading}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Currently on shelf
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 font-mono">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Finished Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {booksCount.completed}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Read and completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 font-mono">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Total Pages Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
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
