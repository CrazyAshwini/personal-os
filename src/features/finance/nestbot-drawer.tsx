'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  answerFinanceQuestion,
  NESTBOT_QUICK_PROMPTS,
  type NestBotMessage,
} from './nestbot-engine';
import type { NativeFinanceWorkspace } from './finance-types';

export function NestBotDrawer({
  open,
  onOpenChange,
  workspace,
  activeMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: NativeFinanceWorkspace;
  activeMonth: string;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<NestBotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask about balances, cards, spending, bills, budgets, FDs, or loans.',
      createdAt: new Date().toISOString(),
      suggestedPrompts: NESTBOT_QUICK_PROMPTS,
    },
  ]);

  const askQuestion = (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;

    const userMsg: NestBotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };
    const replyText = answerFinanceQuestion(query, workspace, activeMonth);
    const botMsg: NestBotMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: replyText,
      createdAt: new Date().toISOString(),
      suggestedPrompts: NESTBOT_QUICK_PROMPTS.filter((p) => p !== query).slice(0, 4),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!text) setInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border bg-emerald-500/5">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </span>
            <span>Finance Assistant</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[55dvh]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-line leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-foreground border border-border/60'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'assistant' && msg.suggestedPrompts && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => askQuestion(prompt)}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Sparkles className="inline h-2.5 w-2.5 mr-1" />
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion();
          }}
          className="p-3 border-t border-border flex items-center gap-2 bg-background"
        >
          <Input
            placeholder="Ask about balances, spending, bills..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" className="h-9 px-3">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
