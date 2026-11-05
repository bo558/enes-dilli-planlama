import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toasts } from '@/design-system/ui';
import { CoachPage } from '@/features/coach/CoachPage';
import { DesignPage } from '@/features/design/DesignPage';
import { FocusPage } from '@/features/focus/FocusPage';
import { GoalDetailPage } from '@/features/goals/GoalDetailPage';
import { GoalWizardPage } from '@/features/goals/GoalWizardPage';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { PetPage } from '@/features/pet/PetPage';
import { PlannerPage } from '@/features/planner/PlannerPage';
import { RemindersPage } from '@/features/reminders/RemindersPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { MePage } from '@/features/settings/MePage';
import { ProfilePage } from '@/features/settings/ProfilePage';
import { SubscriptionPage } from '@/features/settings/SubscriptionPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { TodayPage } from '@/features/today/TodayPage';
import { useApp } from '@/store/app';
import { AppShell } from './AppShell';
import { GlobalLayer } from './GlobalLayer';

export function App() {
  const theme = useApp((s) => s.theme);
  const onboarded = useApp((s) => s.onboarded);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <Routes>
        <Route path="/hosgeldin" element={onboarded ? <Navigate to="/" replace /> : <OnboardingPage />} />
        <Route element={onboarded ? <AppShell /> : <Navigate to="/hosgeldin" replace />}>
          <Route index element={<TodayPage />} />
          <Route path="planla" element={<PlannerPage />} />
          <Route path="gorevler" element={<TasksPage />} />
          <Route path="hedefler" element={<GoalsPage />} />
          <Route path="hedefler/yeni" element={<GoalWizardPage />} />
          <Route path="hedefler/:id" element={<GoalDetailPage />} />
          <Route path="koc" element={<CoachPage />} />
          <Route path="odak" element={<FocusPage />} />
          <Route path="hayvan" element={<PetPage />} />
          <Route path="raporlar" element={<ReportsPage />} />
          <Route path="hatirlaticilar" element={<RemindersPage />} />
          <Route path="ben" element={<MePage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="abonelik" element={<SubscriptionPage />} />
          <Route path="tasarim" element={<DesignPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {onboarded && <GlobalLayer />}
      <Toasts />
    </>
  );
}
