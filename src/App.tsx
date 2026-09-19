import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardTodayTomorrow } from './components/DashboardTodayTomorrow';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { TimetableView } from './components/TimetableView';
import { AllTasksView } from './components/AllTasksView';
import { ParentHistoryView } from './components/ParentHistoryView';
import { CheckInModal } from './components/CheckInModal';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { CheckInAlertBanner } from './components/CheckInAlertBanner';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { CloudAuthModal } from './components/CloudAuthModal';
import { LoginPage } from './components/LoginPage';
import {
  SchoolTask,
  ScheduleItem,
  AppSettings,
  CheckInRecord,
  CheckInAlert,
  AppUser,
} from './types';
import { DEFAULT_SETTINGS } from './data/timetableData';
import {
  loadTasks,
  saveTask,
  deleteTask,
  loadSchedule,
  saveSchedule,
  loadSettings,
  saveSettings,
  saveCheckIn,
  loadBackpackItems,
  saveBackpackItems,
  subscribeToFirebaseBackpack,
  getTomorrowDateStr,
  exportAllData,
  importAllData,
  subscribeToFirebaseTasks,
  pushAllLocalToFirestore,
  broadcastCheckInAlert,
  loadAlerts,
  subscribeToRemoteAlerts,
} from './lib/storage';
import {
  auth,
  signInWithGoogle,
  signInFamilySync,
  logOut,
  getLocalUserSession,
  FirebaseAuthErrorInfo,
  getCurrentDomainAuthInfo,
} from './lib/firebase';
import { playAlertChime, sendBrowserNotification } from './lib/sound';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendario' | 'horario' | 'tarefas' | 'pais'>('dashboard');
  const [tasks, setTasks] = useState<SchoolTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [backpackChecked, setBackpackChecked] = useState<string[]>([]);
  const [user, setUser] = useState<User | AppUser | null>(() => getLocalUserSession());
  const [alerts, setAlerts] = useState<CheckInAlert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<CheckInAlert | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Modals state
  const [checkInTask, setCheckInTask] = useState<SchoolTask | null>(null);
  const [editingTask, setEditingTask] = useState<SchoolTask | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskInitialDate, setAddTaskInitialDate] = useState<string | undefined>(undefined);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cloudAuthError, setCloudAuthError] = useState<FirebaseAuthErrorInfo | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  const tomorrowDateStr = () => getTomorrowDateStr();

  // Listen to Firebase Auth state & sync with active user
  useEffect(() => {
    let unsubTasks: (() => void) | null = null;
    let unsubBackpack: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      const local = getLocalUserSession();
      const activeUser = currentUser || local;
      setUser(activeUser);
      setIsAuthInitializing(false);

      if (activeUser) {
        const tDate = getTomorrowDateStr();

        // 1. Real-time tasks subscription from Firestore (even if empty)
        unsubTasks = subscribeToFirebaseTasks((cloudTasks) => {
          setTasks(cloudTasks);
        });

        // 2. Real-time backpack subscription from Firestore
        unsubBackpack = subscribeToFirebaseBackpack(tDate, (cloudItems) => {
          setBackpackChecked(cloudItems);
        });

        // 3. Immediately pull cloud backpack items or sync local items to cloud
        try {
          const cloudBackpack = await loadBackpackItems(tDate);
          if (cloudBackpack && cloudBackpack.length > 0) {
            setBackpackChecked(cloudBackpack);
          } else {
            // Check if local cache has items that need to be uploaded to cloud
            const rawLocal = localStorage.getItem(`foco_9b_backpack_${tDate}`);
            if (rawLocal) {
              const localItems: string[] = JSON.parse(rawLocal);
              if (localItems && localItems.length > 0) {
                await saveBackpackItems(tDate, localItems);
              }
            }
          }

          // 4. Load cloud settings & schedule
          const [cloudSettings, cloudSchedule] = await Promise.all([
            loadSettings(),
            loadSchedule(),
          ]);
          setSettings(cloudSettings);
          if (cloudSchedule && cloudSchedule.length > 0) {
            setSchedule(cloudSchedule);
          }
        } catch (e) {
          console.warn('Erro ao carregar dados remotos:', e);
        }
      } else {
        if (unsubTasks) {
          unsubTasks();
          unsubTasks = null;
        }
        if (unsubBackpack) {
          unsubBackpack();
          unsubBackpack = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubTasks) unsubTasks();
      if (unsubBackpack) unsubBackpack();
    };
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const tDate = getTomorrowDateStr();
        const [loadedTasks, loadedSchedule, loadedSettings, loadedAlerts, bItems] = await Promise.all([
          loadTasks(),
          loadSchedule(),
          loadSettings(),
          loadAlerts(),
          loadBackpackItems(tDate),
        ]);
        setTasks(loadedTasks);
        setSchedule(loadedSchedule);
        setSettings(loadedSettings);
        setAlerts(loadedAlerts);
        setBackpackChecked(bItems);
      } catch (err) {
        console.error('Erro a inicializar dados:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Listen to incoming real-time check-in alerts (BroadcastChannel + Firestore)
  useEffect(() => {
    const unsubscribeAlerts = subscribeToRemoteAlerts((incomingAlert) => {
      setCurrentAlert(incomingAlert);
      setAlerts((prev) => [incomingAlert, ...prev.filter((a) => a.id !== incomingAlert.id)]);
      playAlertChime();
      sendBrowserNotification(
        'Check-in Concluído! (Foco 9º B)',
        `Check-in de ${incomingAlert.taskTitle} concluído por ${incomingAlert.authorName || 'Francisco'}`
      );
    });

    return () => unsubscribeAlerts();
  }, []);

  // Auth Handlers
  const handleLoginGoogle = async () => {
    setIsLoggingIn(true);
    try {
      const u = await signInWithGoogle();
      if (u) {
        setUser(u);
        setIsCloudModalOpen(false);
        setCloudAuthError(null);
      }
    } catch (err: any) {
      if (err && (err.isUnauthorizedDomain || err.isPopupBlocked || err.code)) {
        setCloudAuthError(err as FirebaseAuthErrorInfo);
      } else {
        const { hostname, projectId, settingsUrl } = getCurrentDomainAuthInfo();
        setCloudAuthError({
          code: err?.code || 'auth/error',
          message: err?.message || 'Falha ao iniciar sessão com Google.',
          isUnauthorizedDomain:
            String(err?.message || '').toLowerCase().includes('unauthorized-domain') ||
            String(err?.code || '').includes('unauthorized-domain'),
          isPopupBlocked:
            String(err?.message || '').toLowerCase().includes('popup-blocked') ||
            String(err?.code || '').includes('popup-blocked'),
          hostname,
          projectId,
          settingsUrl,
        });
      }
      setIsCloudModalOpen(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConnectFamilySync = async () => {
    setIsLoggingIn(true);
    try {
      const u = await signInFamilySync();
      if (u) {
        setUser(u);
        setIsCloudModalOpen(false);
        setCloudAuthError(null);
      }
    } catch (err: any) {
      console.error('Falha na ligação direta da família:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    try {
      await logOut();
      setUser(null);
    } catch (err: any) {
      console.warn('Saída de sessão não concluída:', err?.message || err);
      setUser(null);
    }
  };

  // Handlers
  const handleToggleBackpackItem = async (item: string) => {
    const dateKey = tomorrowDateStr();
    let updated: string[];
    if (backpackChecked.includes(item)) {
      updated = backpackChecked.filter((i) => i !== item);
    } else {
      updated = [...backpackChecked, item];
    }
    setBackpackChecked(updated);
    await saveBackpackItems(dateKey, updated);
  };

  const handleAddTask = async (newTask: SchoolTask) => {
    const updated = [newTask, ...tasks];
    setTasks(updated);
    await saveTask(newTask);
  };

  const handleSyncTasks = async (newTasks: SchoolTask[]) => {
    setTasks(newTasks);
    // Persist each task into storage / Firestore
    for (const t of newTasks) {
      await saveTask(t);
    }
  };

  const handleEditTask = async (updatedTask: SchoolTask) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(updated);
    await saveTask(updatedTask);
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    await deleteTask(taskId);
  };

  const handleConfirmCheckIn = async (record: CheckInRecord) => {
    if (!checkInTask) return;
    const updatedTask: SchoolTask = {
      ...checkInTask,
      checkIn: record,
    };
    const updatedTasks = tasks.map((t) => (t.id === checkInTask.id ? updatedTask : t));
    setTasks(updatedTasks);
    await Promise.all([saveTask(updatedTask), saveCheckIn(record)]);

    // Create and broadcast Check-in Alert to all family devices & tabs
    const alertData: CheckInAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskId: checkInTask.id,
      taskTitle: checkInTask.title,
      subjectCode: checkInTask.subjectCode,
      taskType: checkInTask.type,
      message: `Check-in: ${checkInTask.title} concluído!`,
      timestamp: record.timestamp,
      authorName: settings.studentName || 'Francisco',
      photoDataUrl: record.photoDataUrl,
    };

    setCurrentAlert(alertData);
    setAlerts((prev) => [alertData, ...prev.filter((a) => a.id !== alertData.id)]);
    playAlertChime();
    sendBrowserNotification(
      'Check-in Concluído! (Foco 9º B)',
      `${settings.studentName || 'O Francisco'} concluiu ${checkInTask.title}!`
    );
    await broadcastCheckInAlert(alertData);
  };

  const handleToggleSession = async (taskId: string, sessionId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.studySessions) return;

    const updatedSessions = task.studySessions.map((s) =>
      s.id === sessionId ? { ...s, completed: !s.completed } : s
    );
    const updatedTask = { ...task, studySessions: updatedSessions };
    const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    setTasks(updatedTasks);
    await saveTask(updatedTask);
  };

  const handleUpdateScheduleItem = async (updatedItem: ScheduleItem) => {
    const updated = schedule.map((s) => (s.id === updatedItem.id ? updatedItem : s));
    setSchedule(updated);
    await saveSchedule(updated);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Open Add Task Modal prefilled with specific date
  const handleOpenAddTaskWithDate = (dateStr: string) => {
    setAddTaskInitialDate(dateStr);
    setIsAddTaskOpen(true);
  };

  // Export JSON file
  const handleExportData = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foco-9b-copia-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportData = async (file: File) => {
    const text = await file.text();
    const success = await importAllData(text);
    if (success) {
      const [t, s, set] = await Promise.all([loadTasks(), loadSchedule(), loadSettings()]);
      setTasks(t);
      setSchedule(s);
      setSettings(set);
      alert('Cópia de segurança restaurada com sucesso!');
    } else {
      alert('Erro ao restaurar o ficheiro. Verifica se o ficheiro é válido.');
    }
  };

  // Pending tasks count
  const pendingCount = tasks.filter((t) => !t.checkIn).length;

  if (isLoading || isAuthInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">
            A carregar Foco Escolar 9º B...
          </p>
          <p className="text-xs text-slate-500">
            Escola Básica António Gedeão • A verificar sessão
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated: Show ONLY the Login Page!
  // Nothing of the platform (navbar, dashboard, tasks, schedule, parents) is accessible or visible until login.
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <LoginPage
            user={user}
            settings={settings}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToParents={() => setActiveTab('pais')}
            onUserAuthenticated={(authenticatedUser) => {
              setUser(authenticatedUser);
              setActiveTab('dashboard');
            }}
          />
        </div>
        <footer className="border-t border-slate-200 bg-white py-3.5 px-4 text-center text-xs text-slate-500">
          <p>Foco 9º B • Turma do Francisco • Escola Básica António Gedeão • Acesso Reservado</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans antialiased text-slate-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        user={user}
        alerts={alerts}
        isLoggingIn={isLoggingIn}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenAddTask={() => {
          setAddTaskInitialDate(undefined);
          setIsAddTaskOpen(true);
        }}
        onViewPhoto={(url, title) => setPreviewPhoto({ url, title })}
      />

      {/* Real-time Family Check-in Alert Banner */}
      <CheckInAlertBanner
        alert={currentAlert}
        onDismiss={() => setCurrentAlert(null)}
        onViewPhoto={(url, title) => setPreviewPhoto({ url, title })}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardTodayTomorrow
            tasks={tasks}
            schedule={schedule}
            settings={settings}
            backpackChecked={backpackChecked}
            onToggleBackpackItem={handleToggleBackpackItem}
            onOpenCheckIn={(task) => setCheckInTask(task)}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onToggleSession={handleToggleSession}
            onOpenScheduleTab={() => setActiveTab('horario')}
            onOpenAddTask={() => {
              setAddTaskInitialDate(undefined);
              setIsAddTaskOpen(true);
            }}
          />
        )}

        {/* Monthly Calendar View */}
        {activeTab === 'calendario' && (
          <MonthlyCalendarView
            tasks={tasks}
            schedule={schedule}
            settings={settings}
            onOpenCheckIn={(task) => setCheckInTask(task)}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onToggleSession={handleToggleSession}
            onOpenAddTaskWithDate={handleOpenAddTaskWithDate}
            onAddTask={handleAddTask}
            onUpdateSettings={handleUpdateSettings}
            onSyncTasks={handleSyncTasks}
            currentUser={user}
          />
        )}

        {activeTab === 'horario' && (
          <TimetableView
            schedule={schedule}
            onUpdateScheduleItem={handleUpdateScheduleItem}
          />
        )}

        {activeTab === 'tarefas' && (
          <AllTasksView
            tasks={tasks}
            settings={settings}
            onOpenCheckIn={(task) => setCheckInTask(task)}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onToggleSession={handleToggleSession}
            onOpenAddTask={() => {
              setAddTaskInitialDate(undefined);
              setIsAddTaskOpen(true);
            }}
          />
        )}

        {activeTab === 'pais' && (
          <ParentHistoryView
            tasks={tasks}
            settings={settings}
            user={user}
            isLoggingIn={isLoggingIn}
            onLoginGoogle={handleLoginGoogle}
            onLogoutGoogle={handleLogoutGoogle}
            onConnectFamilySync={handleConnectFamilySync}
            onOpenCloudInfo={() => {
              setCloudAuthError(null);
              setIsCloudModalOpen(true);
            }}
            onSyncAllToCloud={async () => {
              await pushAllLocalToFirestore();
            }}
            onUpdateSettings={handleUpdateSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>Foco 9º B • Turma do Francisco • Escola Básica António Gedeão</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Andebol: Segundas, Quartas e Sextas (20h-22h) • "E Pluribus Unum"
          </p>
        </div>
      </footer>

      {/* Modals */}
      {checkInTask && (
        <CheckInModal
          task={checkInTask}
          isOpen={Boolean(checkInTask)}
          onClose={() => setCheckInTask(null)}
          onConfirm={handleConfirmCheckIn}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          onSaveTask={handleEditTask}
        />
      )}

      {isAddTaskOpen && (
        <AddTaskModal
          isOpen={isAddTaskOpen}
          initialDueDate={addTaskInitialDate}
          onClose={() => {
            setIsAddTaskOpen(false);
            setAddTaskInitialDate(undefined);
          }}
          onAddTask={handleAddTask}
        />
      )}

      {isAiModalOpen && (
        <AiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onAddTask={handleAddTask}
          schoolName={settings.schoolName}
        />
      )}

      {/* Photo Full-Screen Inspection Modal */}
      {previewPhoto && (
        <PhotoViewerModal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          photoUrl={previewPhoto.url}
          title={previewPhoto.title}
        />
      )}

      {/* Cloud Authentication & Domain Authorization Modal */}
      <CloudAuthModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        errorInfo={cloudAuthError}
        onRetryLogin={handleLoginGoogle}
        onConnectFamilySync={handleConnectFamilySync}
        isLoggingIn={isLoggingIn}
      />
    </div>
  );
}
