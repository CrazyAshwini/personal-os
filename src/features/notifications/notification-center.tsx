'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  CheckSquare,
  GraduationCap,
  Flame,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  getNotificationsAction,
  getUnreadNotificationsCountAction,
  type NotificationRow,
} from '@/features/notifications/actions';

interface NotificationCenterProps {
  notifications?: NotificationRow[];
  unreadCount?: number;
}

export function NotificationCenter({
  notifications: initialNotifications = [],
  unreadCount: initialUnreadCount = 0,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications on mount if initial list is empty
  useEffect(() => {
    let mounted = true;
    async function load() {
      const [notifsRes, countRes] = await Promise.all([
        getNotificationsAction(20),
        getUnreadNotificationsCountAction(),
      ]);
      if (mounted) {
        if (notifsRes.data && notifsRes.data.length > 0) {
          setNotifications(notifsRes.data);
        }
        if (typeof countRes.data === 'number') {
          setUnreadCount(countRes.data);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationReadAction(id);
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await markAllNotificationsReadAction();
    });
  };

  const handleDelete = (id: string, wasRead: boolean) => {
    startTransition(async () => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!wasRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      await deleteNotificationAction(id);
    });
  };

  const getTypeIcon = (type: NotificationRow['type']) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'academic':
        return <GraduationCap className="h-4 w-4 text-blue-500" />;
      case 'pomodoro':
        return <Flame className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-sky-500" />;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in fade-in zoom-in-75">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-popover/95 p-0 text-popover-foreground shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p>No notifications yet</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  You&apos;re completely up to date!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 transition-colors flex items-start gap-3 text-xs ${
                    item.is_read
                      ? 'bg-transparent text-muted-foreground'
                      : 'bg-primary/5 text-foreground'
                  } hover:bg-muted/50`}
                >
                  <div className="mt-0.5 shrink-0 rounded-full bg-background p-1.5 border border-border/50">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-medium text-foreground truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] mt-0.5 text-muted-foreground line-clamp-2">
                      {item.message}
                    </p>

                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => setIsOpen(false)}
                        className="text-[11px] text-primary hover:underline font-medium mt-1 inline-block"
                      >
                        View details →
                      </Link>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(item.id)}
                        disabled={isPending}
                        title="Mark as read"
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.is_read)}
                      disabled={isPending}
                      title="Delete notification"
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 p-2 text-center bg-card/50 rounded-b-xl">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Configure notification preferences →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
