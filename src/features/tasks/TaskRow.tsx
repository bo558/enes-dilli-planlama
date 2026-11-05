import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Calendar, CalendarClock, Check, Clock, Timer } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AREAS } from '@/domain/catalog';
import { formatDuration, relativeDay } from '@/domain/dates';
import { isOverdue } from '@/domain/stats';
import type { Task } from '@/domain/types';
import { IconButton, Triangle } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './tasks.css';

export function TaskCheck({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`task-check ${done ? 'is-done' : ''}`}
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <motion.svg width="16" height="16" viewBox="0 0 16 16" initial={false}>
        <motion.path
          d="M3 8.5 6.5 12 13 4.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
        />
      </motion.svg>
    </button>
  );
}

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function TaskRow({
  task,
  showDate,
  hideGoal,
  dragProps,
}: {
  task: Task;
  showDate?: boolean;
  hideGoal?: boolean;
  dragProps?: { draggable: boolean; onDragStart: (e: React.DragEvent) => void };
}) {
  const today = useToday();
  const goal = useApp((s) => s.goals.find((g) => g.id === task.goalId));
  const toggleTask = useApp((s) => s.toggleTask);
  const openTask = useUi((s) => s.openTask);
  const openReschedule = useUi((s) => s.openReschedule);
  const pushToast = useUi((s) => s.pushToast);
  const navigate = useNavigate();
  const overdue = isOverdue(task, today);
  const done = !!task.doneOn;

  // Kaydırma bittiğinde oluşan tıklama, ayrıntı penceresini açmasın.
  const swiped = useRef(false);
  const x = useMotionValue(0);
  const doneOpacity = useTransform(x, [20, 80], [0, 1]);
  const laterOpacity = useTransform(x, [-80, -20], [1, 0]);

  const complete = () => {
    const wasDone = done;
    toggleTask(task.id);
    if (!wasDone) {
      pushToast({
        text: 'Görev tamamlandı',
        tone: 'basari',
        actionLabel: 'Geri al',
        onAction: () => toggleTask(task.id),
      });
    }
  };

  const touch = isTouch();

  const content = (
    <div
      className={`task-row ${done ? 'is-done' : ''} ${task.isMit ? 'is-mit' : ''}`}
      data-testid="task-row"
      data-task-id={task.id}
      onClick={() => {
        if (!swiped.current) openTask(task.id);
      }}
      draggable={dragProps?.draggable}
      onDragStart={dragProps?.onDragStart}
    >
      <TaskCheck done={done} onToggle={complete} label={`${task.title} görevini ${done ? 'geri al' : 'tamamla'}`} />
      <div className="task-row__main">
        <div className="task-row__title">
          {task.isMit && !done && <Triangle size={11} />}
          <span>{task.title}</span>
        </div>
        <div className="task-row__meta">
          {!hideGoal && goal && (
            <span className="meta-item">
              <span className="dot" style={{ background: AREAS[goal.area].color }} />
              <span className="meta-goal">{goal.title}</span>
            </span>
          )}
          {(showDate || overdue) && (
            <span className={`meta-item ${overdue ? 'meta-bad' : ''}`}>
              <Calendar size={12} />
              {relativeDay(task.date, today)}
            </span>
          )}
          {task.time && (
            <span className="meta-item"><Clock size={12} />{task.time}</span>
          )}
          <span className="meta-item">{formatDuration(task.estimateMin)}</span>
          {task.moves.length > 0 && !done && (
            <span className="chip chip--warm task-moved">{task.moves.length} kez taşındı</span>
          )}
        </div>
      </div>
      {!done && (
        <div className="task-row__actions">
          <IconButton
            size="sm"
            label="Odak oturumu başlat"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/odak?gorev=${task.id}`);
            }}
          >
            <Timer size={16} />
          </IconButton>
          <IconButton
            size="sm"
            label="Ertele veya yeniden planla"
            data-testid="task-postpone"
            onClick={(e) => {
              e.stopPropagation();
              openReschedule(task.id);
            }}
          >
            <CalendarClock size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );

  if (!touch) return content;

  return (
    <div className="swipe">
      <motion.div className="swipe__bg swipe__bg--done" style={{ opacity: doneOpacity }}>
        <Check size={20} /> Tamamla
      </motion.div>
      <motion.div className="swipe__bg swipe__bg--later" style={{ opacity: laterOpacity }}>
        Ertele <CalendarClock size={20} />
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        style={{ x, position: 'relative', touchAction: 'pan-y' }}
        onDragStart={() => {
          swiped.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 90 && !done) complete();
          if (info.offset.x < -90 && !done) openReschedule(task.id);
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
          setTimeout(() => {
            swiped.current = false;
          }, 80);
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}
