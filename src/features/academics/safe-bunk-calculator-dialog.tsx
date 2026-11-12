'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  calculateSafeBunkMargin,
  simulateAttendance,
  type ClassSessionRecord,
  calculateAttendance,
} from '@/features/attendance/attendance-calculator';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];
type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row'];

interface SafeBunkCalculatorDialogProps {
  subjects: SubjectRow[];
  sessions: ClassSessionRow[];
  trigger?: React.ReactNode;
  initialSubjectId?: string;
}

export function SafeBunkCalculatorDialog({
  subjects,
  sessions,
  trigger,
  initialSubjectId = 'all',
}: SafeBunkCalculatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [additionalAttended, setAdditionalAttended] = useState<number>(0);
  const [additionalMissed, setAdditionalMissed] = useState<number>(0);

  // Compute baseline stats for selected subject or overall
  const baseStats = useMemo(() => {
    let relevantSessions = sessions;
    if (selectedSubjectId !== 'all') {
      relevantSessions = sessions.filter((s) => s.subject_id === selectedSubjectId);
    }

    const calculated = calculateAttendance(
      relevantSessions.map((s) => ({
        id: s.id,
        status: s.status as ClassSessionRecord['status'],
      }))
    );

    const analysis = calculateSafeBunkMargin(
      calculated.presentSessions,
      calculated.conductedSessions,
      targetPercentage
    );

    return {
      ...calculated,
      analysis,
    };
  }, [sessions, selectedSubjectId, targetPercentage]);

  // Compute interactive simulation
  const simulation = useMemo(() => {
    return simulateAttendance(
      baseStats.presentSessions,
      baseStats.conductedSessions,
      additionalAttended,
      additionalMissed
    );
  }, [baseStats.presentSessions, baseStats.conductedSessions, additionalAttended, additionalMissed]);

  const handleResetSimulation = () => {
    setAdditionalAttended(0);
    setAdditionalMissed(0);
  };

  const isSimSafe = simulation.projectedPercentage >= targetPercentage;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          trigger
            ? 'cursor-pointer inline-flex items-center'
            : 'inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-foreground h-8 px-2.5 text-xs gap-1.5 font-semibold cursor-pointer hover:border-primary/50 transition-colors'
        }
      >
        {trigger || (
          <>
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span>Safe-Bunk Calculator</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calculator className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Safe-Bunk Calculator
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Controls: Course selector & Target percentage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="course-select" className="text-xs font-semibold text-muted-foreground block">
                Select Course
              </label>
              <select
                id="course-select"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  handleResetSimulation();
                }}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm font-medium text-foreground cursor-pointer"
              >
                <option value="all">📊 Overall Semester (All Subjects)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="target-select" className="text-xs font-semibold text-muted-foreground block">
                Criteria Target
              </label>
              <select
                id="target-select"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm font-medium text-foreground cursor-pointer"
              >
                <option value={75}>75% (University Mandatory)</option>
                <option value={80}>80% (Safe Cushion)</option>
                <option value={85}>85% (High Attendance)</option>
                <option value={65}>65% (Medical Concession)</option>
              </select>
            </div>
          </div>

          {/* Current Baseline Card */}
          <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                  Current Attendance Ground Truth
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span
                    className={`text-2xl sm:text-3xl font-black font-mono leading-none ${
                      baseStats.analysis.isSafe
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {baseStats.conductedSessions > 0 ? `${baseStats.percentage}%` : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({baseStats.presentSessions} of {baseStats.conductedSessions} conducted lectures attended)
                  </span>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold py-1 px-2.5 rounded-xl ${
                  baseStats.analysis.isSafe
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                }`}
              >
                {baseStats.analysis.isSafe ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Eligible
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    At Risk
                  </span>
                )}
              </Badge>
            </div>

            {/* Safe Margin / Recovery Advice Box */}
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
                baseStats.analysis.isSafe
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-200 dark:border-rose-900/50 bg-rose-500/10 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div>
                <span className="font-bold block">
                  {baseStats.analysis.isSafe
                    ? baseStats.analysis.canBunkClasses > 0
                      ? `🛡️ Safe Buffer: You can miss ${baseStats.analysis.canBunkClasses} class${baseStats.analysis.canBunkClasses === 1 ? '' : 'es'}`
                      : '⚠️ On the edge: Missing the next lecture drops attendance below target!'
                    : `🚨 Shortage: Must attend ${baseStats.analysis.needToAttendClasses} consecutive class${baseStats.analysis.needToAttendClasses === 1 ? '' : 'es'} without missing`}
                </span>
                <span className="text-[11px] opacity-80 mt-0.5 block">
                  {baseStats.analysis.isSafe
                    ? `Missing up to ${baseStats.analysis.canBunkClasses} class${baseStats.analysis.canBunkClasses === 1 ? '' : 'es'} still keeps your attendance at or above ${targetPercentage}%.`
                    : `Every missed class increases your recovery requirement. Attend the next ${baseStats.analysis.needToAttendClasses} lectures to cross ${targetPercentage}%.`}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive What-If Scenario Simulator */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary font-mono uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Interactive What-If Simulator</span>
              </div>
              {(additionalAttended > 0 || additionalMissed > 0) && (
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Stepper 1: Bunk/Miss Classes */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-foreground block">Bunk / Miss Classes</span>
                  <span className="text-[11px] font-mono text-muted-foreground">Skip next classes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalMissed((m) => Math.max(0, m - 1))}
                    disabled={additionalMissed === 0}
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-lg touch-manipulation active:scale-95 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                  <span className="font-mono font-bold text-sm w-6 text-center text-foreground">
                    {additionalMissed}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalMissed((m) => m + 1)}
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-lg hover:border-rose-400 hover:text-rose-600 touch-manipulation active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              </div>

              {/* Stepper 2: Attend Classes */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-foreground block">Attend Classes</span>
                  <span className="text-[11px] font-mono text-muted-foreground">Extra attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalAttended((a) => Math.max(0, a - 1))}
                    disabled={additionalAttended === 0}
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-lg touch-manipulation active:scale-95 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                  <span className="font-mono font-bold text-sm w-6 text-center text-foreground">
                    {additionalAttended}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalAttended((a) => a + 1)}
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-lg hover:border-emerald-400 hover:text-emerald-600 touch-manipulation active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Projected Outcome Gauge */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Projected Attendance Outcome
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    isSimSafe
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {simulation.projectedPercentage}%
                </span>
              </div>

              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isSimSafe ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                  style={{ width: `${Math.min(100, simulation.projectedPercentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                <span>
                  {simulation.projectedPresent}/{simulation.projectedConducted} projected lectures
                </span>
                <span className={isSimSafe ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-700 dark:text-rose-400 font-bold'}>
                  {isSimSafe ? '✓ Safe above criteria' : `✗ Deficit: Below ${targetPercentage}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
