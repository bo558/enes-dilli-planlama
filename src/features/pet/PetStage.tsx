import { motion, useAnimationControls } from 'motion/react';
import { useEffect } from 'react';
import { MOOD_LINE, moodFor, stageFor, stageProgress } from '@/domain/gamification';
import { dayProgress, daysSinceActive } from '@/domain/stats';
import type { PetMood } from '@/domain/types';
import { Ribbon } from '@/design-system/Ribbon';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import { PetArt } from './PetArt';
import './pet.css';

export const usePetMood = (): PetMood => {
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const data = useApp();
  return moodFor(dayProgress(tasks, today).pct, daysSinceActive(data, today));
};

export function PetStage({ size = 170, height }: { size?: number; height?: number }) {
  const pet = useApp((s) => s.pet);
  const pulse = useUi((s) => s.petPulse);
  const mood = usePetMood();
  const controls = useAnimationControls();
  const stage = stageFor(pet.xp);

  useEffect(() => {
    if (pulse > 0) {
      controls.start({
        y: [0, -16, 0, -6, 0],
        rotate: [0, -3, 3, 0],
        transition: { duration: 0.65, ease: 'easeOut' },
      });
    }
  }, [pulse, controls]);

  if (pet.plainMode) {
    return (
      <div className="pet-stage pet-stage--plain" style={{ minHeight: height }}>
        <Ribbon value={stageProgress(pet.xp)} size={size} label="Sonraki aşamaya ilerleme" />
      </div>
    );
  }

  return (
    <div className={`pet-stage pet-stage--${pet.backdrop}`} style={{ minHeight: height }}>
      <motion.button
        type="button"
        className="pet-stage__art"
        aria-label={`${pet.name || 'Yoldaşın'}: ${MOOD_LINE[mood]}`}
        animate={controls}
        onClick={() =>
          controls.start({ y: [0, -12, 0], scale: [1, 1.04, 1], transition: { duration: 0.4 } })
        }
      >
        <span className="pet-stage__bob">
          <PetArt
            species={pet.species}
            stage={stage.id}
            mood={mood}
            equipped={pet.equipped}
            size={size}
            progress={stageProgress(pet.xp)}
          />
        </span>
      </motion.button>
    </div>
  );
}
