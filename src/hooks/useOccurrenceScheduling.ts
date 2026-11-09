import { useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ProgramOccurrence } from '../types/database';

type MoveUpdates = { event_date: string; start_time?: string | null; end_time?: string | null };
type CreateOverrides = { start_time?: string | null; end_time?: string | null; max_participants?: number | null };

// Kanban f1b8d7a3: a ProviderScheduleWeekBoard huzas/masolas/torles allapot-gepe es
// @dnd-kit szenzora egy helyre kiemelve, hogy a ProviderScheduleCalendar (honap-nezet)
// is hasznalhassa ugyanazt a mechanikat masolas/beillesztes nelkul (Zora dontese,
// msg 3380): a masolas TOVABBRA IS az eredeti ikon-gomb + datum-valaszto minta, nincs
// uj Ctrl-drag/long-press egyik nezetben sem.
export function useOccurrenceScheduling(
  occurrencesMap: Record<string, ProgramOccurrence>,
  onMoveOccurrence: (occurrenceId: string, updates: MoveUpdates) => Promise<void>,
  onCreateOccurrence: (programId: string, dateStr: string, overrides: CreateOverrides) => Promise<void>,
  onDeleteOccurrence: (occurrenceId: string) => Promise<void>
) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragError, setDragError] = useState<string | null>(null);

  const [movingOccurrenceId, setMovingOccurrenceId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveStartTime, setMoveStartTime] = useState('');
  const [moveEndTime, setMoveEndTime] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [copyingOccurrenceId, setCopyingOccurrenceId] = useState<string | null>(null);
  const [copyDate, setCopyDate] = useState('');
  const [copySaving, setCopySaving] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [deletingOccurrenceId, setDeletingOccurrenceId] = useState<string | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const occurrenceId = String(active.id);
    const targetDate = String(over.id);
    const occ = occurrencesMap[occurrenceId];
    if (!occ) return;
    const currentDate = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    if (currentDate === targetDate) return;

    setDragError(null);
    try {
      await onMoveOccurrence(occurrenceId, {
        event_date: targetDate,
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
      });
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'Az áthelyezés nem sikerült (húzással).');
    }
  };

  const startMove = (occ: ProgramOccurrence) => {
    setMovingOccurrenceId(occ.id);
    const dateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    setMoveDate(dateStr);
    setMoveStartTime(occ.start_time || '');
    setMoveEndTime(occ.end_time || '');
    setMoveError(null);
  };

  const cancelMove = () => {
    setMovingOccurrenceId(null);
    setMoveError(null);
  };

  const saveMove = async () => {
    if (!movingOccurrenceId || !moveDate) return;
    setMoveSaving(true);
    setMoveError(null);
    try {
      await onMoveOccurrence(movingOccurrenceId, {
        event_date: moveDate,
        start_time: moveStartTime || null,
        end_time: moveEndTime || null,
      });
      setMovingOccurrenceId(null);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Az áthelyezés nem sikerült.');
    } finally {
      setMoveSaving(false);
    }
  };

  const startCopy = (occ: ProgramOccurrence) => {
    setCopyingOccurrenceId(occ.id);
    setCopyDate('');
    setCopyError(null);
  };

  const cancelCopy = () => {
    setCopyingOccurrenceId(null);
    setCopyError(null);
  };

  const saveCopy = async (occ: ProgramOccurrence, targetDate: string) => {
    if (!targetDate) return;
    setCopySaving(true);
    setCopyError(null);
    try {
      await onCreateOccurrence(occ.program_id, targetDate, {
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
        max_participants: occ.max_participants ?? null,
      });
      setCopyingOccurrenceId(null);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'A másolás nem sikerült.');
    } finally {
      setCopySaving(false);
    }
  };

  const handleDelete = async (occurrenceId: string) => {
    if (!window.confirm('Biztosan törlöd ezt az időpontot? Ha van hozzá foglalás, a törlés nem fog sikerülni.')) return;
    setDeletingOccurrenceId(occurrenceId);
    try {
      await onDeleteOccurrence(occurrenceId);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'A törlés nem sikerült.');
    } finally {
      setDeletingOccurrenceId(null);
    }
  };

  return {
    sensors,
    dragError,
    setDragError,
    handleDragEnd,
    movingOccurrenceId,
    moveDate,
    moveStartTime,
    moveEndTime,
    moveSaving,
    moveError,
    startMove,
    cancelMove,
    saveMove,
    setMoveDate,
    setMoveStartTime,
    setMoveEndTime,
    copyingOccurrenceId,
    copyDate,
    copySaving,
    copyError,
    startCopy,
    cancelCopy,
    saveCopy,
    setCopyDate,
    deletingOccurrenceId,
    handleDelete,
  };
}
