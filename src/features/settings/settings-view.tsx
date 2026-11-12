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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-xs ${
            feedback.type === 'success'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Account Info Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Primary Email</span>
              <span className="font-medium text-foreground font-mono">{userEmail}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Profile Name</span>
              <span className="font-medium text-foreground">{userName || 'Personal OS User'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyTaskDeadlines}
                onCheckedChange={(checked) =>
                  setNotifyTaskDeadlines(checked === true)
                }
              />
              <span className="text-xs font-medium text-foreground">
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
              <span className="text-xs font-medium text-foreground">
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
              <span className="text-xs font-medium text-foreground">
                Academic class timetable and session alerts
              </span>
            </label>

            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={soundEnabled}
                  onCheckedChange={(checked) =>
                    setSoundEnabled(checked === true)
                  }
                />
                <span className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  Enable timer chimes and reminder sound alerts
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Timer Configuration Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">Pomodoro Durations</CardTitle>
          </div>
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
                className="h-8 text-xs rounded-lg"
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
                className="h-8 text-xs rounded-lg"
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
                className="h-8 text-xs rounded-lg"
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
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional & Timezone Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">Timezone &amp; Format</CardTitle>
          </div>
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
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Time Clock Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={timeFormat === '24h' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs flex-1 rounded-lg border-border cursor-pointer ${
                    timeFormat === '24h' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                  onClick={() => setTimeFormat('24h')}
                >
                  24-hour (14:30)
                </Button>
                <Button
                  type="button"
                  variant={timeFormat === '12h' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs flex-1 rounded-lg border-border cursor-pointer ${
                    timeFormat === '12h' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
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
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl border border-border bg-muted/40">
            <p className="text-xs font-medium text-foreground font-mono">{userEmail}</p>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="text-xs h-8 gap-1.5 cursor-pointer rounded-lg shadow-xs"
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
        <Button type="submit" disabled={isPending} className="text-xs h-9 gap-2 rounded-lg shadow-xs cursor-pointer">
          <Save className="h-4 w-4" />
          {isPending ? 'Saving preferences...' : 'Save all preferences'}
        </Button>
      </div>
    </form>
  );
}
