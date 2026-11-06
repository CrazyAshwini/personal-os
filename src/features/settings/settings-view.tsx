'use client';

import { signOutAction } from '@/lib/auth/actions';

import React, { useState, useTransition } from 'react';
import {
  Bell,
  Clock,
  Globe,
  Save,
  Shield,
  Volume2,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  updateUserPreferencesAction,
  type UserPreferencesRow,
} from '@/features/settings/actions';

interface SettingsViewProps {
  preferences: UserPreferencesRow | null;
  userEmail: string;
  userName?: string | null;
}

export function SettingsView({
  preferences,
  userEmail,
  userName,
}: SettingsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // General & Timezone
  const [timezone, setTimezone] = useState(preferences?.timezone || 'UTC');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(
    preferences?.time_format || '24h'
  );

  // Pomodoro
  const [pomodoroWork, setPomodoroWork] = useState(
    preferences?.pomodoro_work_duration || 25
  );
  const [pomodoroShortBreak, setPomodoroShortBreak] = useState(
    preferences?.pomodoro_short_break || 5
  );
  const [pomodoroLongBreak, setPomodoroLongBreak] = useState(
    preferences?.pomodoro_long_break || 15
  );
  const [pomodoroInterval, setPomodoroInterval] = useState(
    preferences?.pomodoro_long_break_interval || 4
  );

  // Notifications
  const [notifyTaskDeadlines, setNotifyTaskDeadlines] = useState(
    preferences?.notify_task_deadlines ?? true
  );
  const [notifyCalendarReminders, setNotifyCalendarReminders] = useState(
    preferences?.notify_calendar_reminders ?? true
  );
  const [notifyAcademicClasses, setNotifyAcademicClasses] = useState(
    preferences?.notify_academic_classes ?? true
  );
  const [soundEnabled, setSoundEnabled] = useState(
    preferences?.sound_enabled ?? true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateUserPreferencesAction({
        timezone,
        timeFormat,
        pomodoroWorkDuration: Number(pomodoroWork),
        pomodoroShortBreak: Number(pomodoroShortBreak),
        pomodoroLongBreak: Number(pomodoroLongBreak),
        pomodoroLongBreakInterval: Number(pomodoroInterval),
        notifyTaskDeadlines,
        notifyCalendarReminders,
        notifyAcademicClasses,
        soundEnabled,
      });

      if (res.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({
          type: 'success',
          message: 'Preferences updated successfully.',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {feedback && (
        <div
          className={`p-3.5 rounded-lg flex items-center gap-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Account Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Account & Privacy</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Personal OS is your isolated private vault. Row Level Security enforces
            strict ownership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Primary Email</span>
              <span className="font-medium text-foreground">{userEmail}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Profile Name</span>
              <span className="font-medium text-foreground">{userName || 'Personal OS User'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Configure alert rules for tasks, study timers, and upcoming schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyTaskDeadlines}
                onCheckedChange={(checked) =>
                  setNotifyTaskDeadlines(checked === true)
                }
              />
              <span className="text-xs font-medium">
                Task deadlines and due date notifications
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyCalendarReminders}
                onCheckedChange={(checked) =>
                  setNotifyCalendarReminders(checked === true)
                }
              />
              <span className="text-xs font-medium">
                Calendar events and custom reminders
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyAcademicClasses}
                onCheckedChange={(checked) =>
                  setNotifyAcademicClasses(checked === true)
                }
              />
              <span className="text-xs font-medium">
                Academic class timetable and session alerts
              </span>
            </label>

            <div className="pt-2 border-t border-border/50">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={soundEnabled}
                  onCheckedChange={(checked) =>
                    setSoundEnabled(checked === true)
                  }
                />
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Enable timer chimes and reminder sound alerts
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Timer Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Study & Pomodoro Durations</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Set default minutes for focus intervals and break periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="work" className="text-xs font-medium">Focus (min)</Label>
              <Input
                id="work"
                type="number"
                min={1}
                max={180}
                value={pomodoroWork}
                onChange={(e) => setPomodoroWork(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortBreak" className="text-xs font-medium">Short break (min)</Label>
              <Input
                id="shortBreak"
                type="number"
                min={1}
                max={60}
                value={pomodoroShortBreak}
                onChange={(e) => setPomodoroShortBreak(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longBreak" className="text-xs font-medium">Long break (min)</Label>
              <Input
                id="longBreak"
                type="number"
                min={1}
                max={120}
                value={pomodoroLongBreak}
                onChange={(e) => setPomodoroLongBreak(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interval" className="text-xs font-medium">Interval (cycles)</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                max={20}
                value={pomodoroInterval}
                onChange={(e) => setPomodoroInterval(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional & Timezone Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Timezone & Regional Formats</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Manage your local display preferences for calendar and timetable times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tz" className="text-xs font-medium">Timezone</Label>
              <Input
                id="tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. UTC, Asia/Kolkata, America/New_York"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Time Clock Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={timeFormat === '24h' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={() => setTimeFormat('24h')}
                >
                  24-hour (14:30)
                </Button>
                <Button
                  type="button"
                  variant={timeFormat === '12h' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={() => setTimeFormat('12h')}
                >
                  12-hour (2:30 PM)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account & Session */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Account & Session
          </CardTitle>
          <CardDescription className="text-xs">
            Manage your session and access to Personal OS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">{userEmail}</p>
              <p className="text-[11px] text-muted-foreground">
                Signed in securely with Supabase Auth
              </p>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="text-xs h-8 gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending} className="text-xs h-9 gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Saving preferences...' : 'Save all preferences'}
        </Button>
      </div>
    </form>
  );
}
