import { CheckCircle2, Maximize2, Minimize2, Pause, Play, SkipForward, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/app/AppShell';
import { FUTURE_TECHNIQUES, TECHNIQUES } from '@/domain/catalog';
import { formatClock, formatDuration, relativeDay } from '@/domain/dates';
import { sortTasks, tasksOn } from '@/domain/stats';
import type { TechniqueId } from '@/domain/types';
import { Ribbon } from '@/design-system/Ribbon';
import { Button, Field, IconButton, Sheet, Triangle } from '@/design-system/ui';
import { focusElapsedSec, useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './focus.css';

function useNow(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

function RunningFocus({ fullscreen }: { fullscreen?: boolean }) {
  const focus = useApp((s) => s.focus);
  const tasks = useApp((s) => s.tasks);
  const { pauseFocus, resumeFocus, finishFocusEarly, skipBreak, startNextCycle, cancelFocus } = useApp.getState();
  const setExpanded = useUi((s) => s.setFocusExpanded);
  useNow(!!focus?.startedAt);
  if (!focus) return null;

  const elapsed = focusElapsedSec(focus);
  const countUp = focus.plannedSec === 0;
  const shown = countUp ? elapsed : Math.max(0, focus.plannedSec - elapsed);
  const value = countUp ? Math.min(1, elapsed / (45 * 60)) : Math.min(1, elapsed / focus.plannedSec);
  const task = tasks.find((t) => t.id === focus.taskId);
  const technique = TECHNIQUES.find((t) => t.id === focus.technique)!;
  const isBreak = focus.phase === 'mola';
  const breakDone = isBreak && !focus.startedAt && elapsed >= focus.plannedSec;
  const running = !!focus.startedAt;

  return (
    <div className={`run ${isBreak ? 'is-break' : ''} ${fullscreen ? 'is-full' : ''}`} data-testid="focus-running">
      <div className="run__top">
        <span className="run__tech">{isBreak ? 'Mola' : technique.name}</span>
        <IconButton
          label={fullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
          className="run__icon"
          onClick={() => setExpanded(!fullscreen)}
          data-testid="focus-expand"
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </IconButton>
      </div>

      <div className="run__ribbon">
        <Ribbon
          value={value}
          size={fullscreen ? 300 : 230}
          track="rgb(255 255 255 / 0.1)"
          fill={isBreak ? '#f4b85e' : '#60a4f1'}
          triangle={isBreak ? '#60a4f1' : '#f4b85e'}
          duration={0.6}
          label="Oturum ilerlemesi"
        />
      </div>

      <div className="run__clock num" data-testid="focus-clock" aria-live="off">{formatClock(shown)}</div>
      <div className="run__task">
        {isBreak ? (breakDone ? 'Mola bitti. Hazır olduğunda devam et.' : 'Bir bardak su, biraz hareket.') : task ? task.title : 'Göreve bağlı olmayan oturum'}
      </div>

      {focus.breakMin > 0 && (
        <div className="run__cycles" aria-label={`${focus.cycle}. oturum`}>
          {Array.from({ length: 4 }, (_, i) => (
            <Triangle key={i} size={12} color={i < focus.cycle ? '#f4b85e' : 'rgb(255 255 255 / 0.22)'} filled={i < focus.cycle} />
          ))}
        </div>
      )}

      <div className="run__actions">
        {breakDone ? (
          <>
            <Button variant="warm" onClick={startNextCycle} data-testid="focus-next-cycle"><Play size={17} /> Sonraki oturum</Button>
            <Button className="run__ghost" variant="ghost" onClick={cancelFocus}><Square size={15} /> Bitir</Button>
          </>
        ) : isBreak ? (
          <>
            <Button className="run__ghost" variant="ghost" onClick={skipBreak} data-testid="focus-skip-break"><SkipForward size={16} /> Molayı atla</Button>
            <Button className="run__ghost" variant="ghost" onClick={cancelFocus}><Square size={15} /> Bitir</Button>
          </>
        ) : (
          <>
            {running ? (
              <Button variant="warm" onClick={pauseFocus} data-testid="focus-pause"><Pause size={17} /> Duraklat</Button>
            ) : (
              <Button variant="warm" onClick={resumeFocus} data-testid="focus-resume"><Play size={17} /> Devam et</Button>
            )}
            <Button className="run__ghost" variant="ghost" onClick={finishFocusEarly} data-testid="focus-finish"><Square size={15} /> Bitir</Button>
          </>
        )}
      </div>
    </div>
  );
}

export function FocusFullscreen() {
  const expanded = useUi((s) => s.focusExpanded);
  const focus = useApp((s) => s.focus);
  const summary = useUi((s) => s.focusSummary);
  const setSummary = useUi((s) => s.setFocusSummary);
  const tasks = useApp((s) => s.tasks);
  const toggleTask = useApp((s) => s.toggleTask);
  const task = tasks.find((t) => t.id === summary?.taskId);

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {expanded && focus && (
            <motion.div className="focus-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RunningFocus fullscreen />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <Sheet
        open={!!summary}
        onClose={() => setSummary(null)}
        title={summary?.completed ? 'Oturum tamamlandı' : 'Oturum kaydedildi'}
        footer={
          task && !task.doneOn ? (
            <>
              <Button variant="secondary" onClick={() => setSummary(null)}>Daha bitmedi</Button>
              <Button onClick={() => { toggleTask(task.id); setSummary(null); }} data-testid="summary-done">
                <CheckCircle2 size={16} /> Görevi tamamla
              </Button>
            </>
          ) : (
            <Button onClick={() => setSummary(null)} data-testid="summary-close">Tamam</Button>
          )
        }
      >
        <div className="summary" data-testid="focus-summary">
          <div><strong className="num">{formatDuration(summary?.minutes ?? 0)}</strong><span>odak</span></div>
          <div><strong className="num">+{summary?.xp ?? 0}</strong><span>puan</span></div>
        </div>
        {task && !task.doneOn && <p style={{ color: 'var(--muted)' }}>"{task.title}" görevini bitirdin mi?</p>}
        {summary?.xp === 0 && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Beş dakikadan kısa oturumlar veya günlük sınır puan kazandırmaz; süren yine de raporuna yazıldı.</p>}
      </Sheet>
    </>
  );
}

export function FocusPage() {
  const [params] = useSearchParams();
  const today = useToday();
  const focus = useApp((s) => s.focus);
  const tasks = useApp((s) => s.tasks);
  const sessions = useApp((s) => s.sessions);
  const startFocus = useApp((s) => s.startFocus);
  const [technique, setTechnique] = useState<TechniqueId>((params.get('teknik') as TechniqueId) || 'pomodoro');
  const [taskId, setTaskId] = useState<string>(params.get('gorev') ?? '');
  const info = TECHNIQUES.find((t) => t.id === technique)!;
  const [focusMin, setFocusMin] = useState(info.defaultFocus);
  const [breakMin, setBreakMin] = useState(info.defaultBreak);
  const [libraryId, setLibraryId] = useState<TechniqueId | null>(null);

  useEffect(() => {
    setFocusMin(info.defaultFocus);
    setBreakMin(info.defaultBreak);
  }, [info]);

  const candidates = useMemo(() => {
    const todayList = sortTasks(tasksOn(tasks, today)).filter((t) => !t.doneOn);
    const others = tasks.filter((t) => !t.doneOn && t.date !== today && t.date && t.date > today).slice(0, 8);
    return [...todayList, ...others];
  }, [tasks, today]);

  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMin = todaySessions.reduce((s, x) => s + x.actualMin, 0);
  const recent = useMemo(
    () => [...sessions].sort((a, b) => (a.date === b.date ? b.hour - a.hour : b.date.localeCompare(a.date))).slice(0, 5),
    [sessions],
  );
  const libraryInfo = TECHNIQUES.find((t) => t.id === libraryId);

  return (
    <div className="page focus-page">
      <PageHeader
        eyebrow="Odak"
        title={focus ? <>Şu an <em>odaktasın</em></> : <>Tek işe <em>odaklan</em></>}
        sub={`Bugün ${formatDuration(todayMin)} · ${todaySessions.length} oturum`}
      />

      <div className="focus-grid">
        <div className="focus-main">
          {focus ? (
            <RunningFocus />
          ) : (
            <section className="card setup">
              <div>
                <span className="field__label">Teknik seç</span>
                <div className="tech-grid">
                  {TECHNIQUES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="tech"
                      aria-pressed={technique === t.id}
                      onClick={() => setTechnique(t.id)}
                      data-testid={`tech-${t.id}`}
                    >
                      <span className="tech__badge num">{t.badge}</span>
                      <strong>{t.name}</strong>
                      <small>{t.short}</small>
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Hangi görev için?">
                <select className="input" value={taskId} onChange={(e) => setTaskId(e.target.value)} data-testid="focus-task">
                  <option value="">Göreve bağlamadan başla</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>{relativeDay(t.date, today)}: {t.title}</option>
                  ))}
                </select>
              </Field>

              {!info.countUp && technique !== 'iki-dakika' && (
                <div className="field-row">
                  <div className="field">
                    <span className="field__label">Odak süresi</span>
                    <div className="est-row">
                      {[15, 25, 50].map((m) => (
                        <button key={m} type="button" className="option-chip" aria-pressed={focusMin === m} onClick={() => setFocusMin(m)}>{m} dk</button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <span className="field__label">Mola</span>
                    <div className="est-row">
                      {[5, 10, 15].map((m) => (
                        <button key={m} type="button" className="option-chip" aria-pressed={breakMin === m} onClick={() => setBreakMin(m)}>{m} dk</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button
                block
                onClick={() => startFocus(technique, taskId || null, focusMin, breakMin)}
                data-testid="focus-start"
              >
                <Play size={17} /> {info.countUp ? 'Sayacı başlat' : `${focusMin} dakika başlat`}
              </Button>
            </section>
          )}
        </div>

        <aside className="focus-side">
          <section className="card">
            <div className="card__title" style={{ marginBottom: 10 }}>Teknik kitaplığı</div>
            <ul className="tech-lib">
              {TECHNIQUES.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setLibraryId(t.id)}>
                    <strong>{t.name}</strong>
                    <small>{t.whenToUse}</small>
                  </button>
                </li>
              ))}
              {FUTURE_TECHNIQUES.map((t) => (
                <li key={t.name} className="is-future">
                  <div>
                    <strong>{t.name} <span className="chip chip--outline">{t.where}</span></strong>
                    <small>{t.when}</small>
                  </div>
                </li>
              ))}
            </ul>
            <p className="tech-note">Genel tekniklerdir. Enes Dilli'nin kendi yöntemleri içerik geldiğinde bu listeye eklenecek.</p>
          </section>
          <section className="card">
            <div className="card__title" style={{ marginBottom: 10 }}>Son oturumlar</div>
            <ul className="sessions" data-testid="session-list">
              {recent.map((s) => {
                const t = tasks.find((x) => x.id === s.taskId);
                const tn = TECHNIQUES.find((x) => x.id === s.technique);
                return (
                  <li key={s.id}>
                    <span>
                      <strong>{t?.title ?? tn?.name}</strong>
                      <small>{relativeDay(s.date, today)} · {tn?.name}</small>
                    </span>
                    <b className="num">{formatDuration(s.actualMin)}</b>
                  </li>
                );
              })}
              {recent.length === 0 && <li style={{ color: 'var(--muted)' }}>İlk oturumun burada görünecek.</li>}
            </ul>
          </section>
        </aside>
      </div>

      <Sheet
        open={!!libraryInfo}
        onClose={() => setLibraryId(null)}
        title={libraryInfo?.name}
        subtitle={libraryInfo?.whenToUse}
        footer={
          <Button
            onClick={() => {
              if (libraryInfo) setTechnique(libraryInfo.id);
              setLibraryId(null);
            }}
          >
            Bu tekniği seç
          </Button>
        }
      >
        <ol className="how">
          {libraryInfo?.how.map((h, i) => (
            <li key={h}><span className="num">{String(i + 1).padStart(2, '0')}</span>{h}</li>
          ))}
        </ol>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Genel bilgi. Enes Dilli içeriği değildir.</p>
      </Sheet>
    </div>
  );
}
