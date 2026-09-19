import { SchoolTask, CheckInRecord, ScheduleItem, AppSettings, CheckInAlert } from '../types';
import { INITIAL_TASKS, INITIAL_SCHEDULE, DEFAULT_SETTINGS } from '../data/timetableData';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

const DB_NAME = 'FocoEscolar9B_DB';
const DB_VERSION = 2;
const FALLBACK_PREFIX = 'foco_9b_';

export function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Helper to remove undefined values for Firestore serialization
function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const res: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (Array.isArray(v)) {
        res[k] = v.map((item) =>
          typeof item === 'object' && item !== null ? cleanForFirestore(item) : item
        );
      } else if (typeof v === 'object' && v !== null) {
        res[k] = cleanForFirestore(v);
      } else {
        res[k] = v;
      }
    }
  }
  return res;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('checkins')) {
        db.createObjectStore('checkins', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('schedule')) {
        db.createObjectStore('schedule', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('backpack')) {
        db.createObjectStore('backpack', { keyPath: 'dateKey' });
      }
      if (!db.objectStoreNames.contains('alerts')) {
        db.createObjectStore('alerts', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------- TASKS -----------------

export async function loadTasks(): Promise<SchoolTask[]> {
  const hasSeeded = typeof window !== 'undefined' ? localStorage.getItem(`${FALLBACK_PREFIX}has_seeded`) : null;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction('tasks', 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as SchoolTask[];
        if ((!result || result.length === 0) && !hasSeeded) {
          // Seed with initial tasks ONLY on first ever run before user has configured anything
          const txWrite = db.transaction('tasks', 'readwrite');
          const storeWrite = txWrite.objectStore('tasks');
          INITIAL_TASKS.forEach((t) => storeWrite.put(t));
          try {
            localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
            localStorage.setItem(`${FALLBACK_PREFIX}tasks`, JSON.stringify(INITIAL_TASKS));
          } catch {}
          resolve(INITIAL_TASKS);
        } else {
          try {
            localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
          } catch {}
          resolve(result || []);
        }
      };
      request.onerror = () => {
        resolve(loadTasksFromLocalStorage());
      };
    });
  } catch (err) {
    console.warn('Erro ao abrir IndexedDB, a usar fallback:', err);
    return loadTasksFromLocalStorage();
  }
}

function loadTasksFromLocalStorage(): SchoolTask[] {
  const hasSeeded = typeof window !== 'undefined' ? localStorage.getItem(`${FALLBACK_PREFIX}has_seeded`) : null;
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}tasks`);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    if (!hasSeeded) {
      localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
      localStorage.setItem(`${FALLBACK_PREFIX}tasks`, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    return [];
  } catch {
    return hasSeeded ? [] : INITIAL_TASKS;
  }
}

export async function saveTask(task: SchoolTask): Promise<void> {
  // 1. Save to local IndexedDB & LocalStorage for instant UI update
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').put(task);
  } catch (err) {
    console.warn('Erro no IndexedDB:', err);
  }
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}tasks`);
    let tasks: SchoolTask[] = raw ? JSON.parse(raw) : [];
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.unshift(task);
    localStorage.setItem(`${FALLBACK_PREFIX}tasks`, JSON.stringify(tasks));
    localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
  } catch {
    // ignore
  }

  // 2. Sync to Firebase Firestore if user is authenticated or firestore available
  if (auth.currentUser) {
    const path = `tasks/${task.id}`;
    try {
      await setDoc(doc(db, 'tasks', task.id), cleanForFirestore(task));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  // 1. Local delete in IndexedDB
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').delete(taskId);
  } catch (err) {
    console.warn('Erro ao eliminar tarefa no IndexedDB:', err);
  }

  // 2. Local delete in LocalStorage (without calling loadTasks() to prevent re-seeding)
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}tasks`);
    if (raw) {
      const parsed = JSON.parse(raw) as SchoolTask[];
      const filtered = parsed.filter((t) => t.id !== taskId);
      localStorage.setItem(`${FALLBACK_PREFIX}tasks`, JSON.stringify(filtered));
      localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
    }
  } catch {
    // ignore
  }

  // 3. Delete in Firebase Firestore if authenticated
  if (auth.currentUser) {
    const path = `tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
}

// Subscribe to real-time changes from Firestore
export function subscribeToFirebaseTasks(onUpdate: (tasks: SchoolTask[]) => void): () => void {
  if (!auth.currentUser) {
    return () => {};
  }

  const path = 'tasks';
  const unsubscribe = onSnapshot(
    collection(db, path),
    (snapshot) => {
      const cloudTasks: SchoolTask[] = [];
      snapshot.forEach((docSnap) => {
        cloudTasks.push(docSnap.data() as SchoolTask);
      });

      // Update local storage and IndexedDB with cloud authority
      try {
        localStorage.setItem(`${FALLBACK_PREFIX}tasks`, JSON.stringify(cloudTasks));
        localStorage.setItem(`${FALLBACK_PREFIX}has_seeded`, 'true');
      } catch {
        // ignore
      }

      openDatabase()
        .then((idb) => {
          const tx = idb.transaction('tasks', 'readwrite');
          const store = tx.objectStore('tasks');
          store.clear();
          cloudTasks.forEach((t) => store.put(t));
        })
        .catch(() => {});

      // Call onUpdate with cloudTasks (even if empty [])
      onUpdate(cloudTasks);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );

  return unsubscribe;
}

// ----------------- CHECKINS -----------------

export async function loadCheckIns(): Promise<CheckInRecord[]> {
  try {
    const dbInst = await openDatabase();
    return new Promise((resolve) => {
      const tx = dbInst.transaction('checkins', 'readonly');
      const store = tx.objectStore('checkins');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve(loadCheckInsFromLocalStorage());
    });
  } catch {
    return loadCheckInsFromLocalStorage();
  }
}

function loadCheckInsFromLocalStorage(): CheckInRecord[] {
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}checkins`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCheckIn(record: CheckInRecord): Promise<void> {
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('checkins', 'readwrite');
    tx.objectStore('checkins').put(record);
  } catch (err) {
    console.warn('Erro ao gravar check-in no IndexedDB:', err);
  }
  try {
    const existing = await loadCheckIns();
    const updated = [record, ...existing.filter((c) => c.id !== record.id)];
    localStorage.setItem(`${FALLBACK_PREFIX}checkins`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Sync to Firebase
  if (auth.currentUser) {
    const path = `checkins/${record.id}`;
    try {
      await setDoc(doc(db, 'checkins', record.id), cleanForFirestore(record));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

// ----------------- SCHEDULE -----------------

export async function loadSchedule(): Promise<ScheduleItem[]> {
  // If user is logged in, check Firestore
  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'schedule'));
      if (!snap.empty) {
        const cloudSched: ScheduleItem[] = [];
        snap.forEach((d) => cloudSched.push(d.data() as ScheduleItem));
        if (cloudSched.length > 0) {
          try {
            const dbInst = await openDatabase();
            const tx = dbInst.transaction('schedule', 'readwrite');
            const store = tx.objectStore('schedule');
            store.clear();
            cloudSched.forEach((s) => store.put(s));
          } catch {}
          return cloudSched;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar horário do Firestore:', err);
    }
  }

  const hasSeededSchedule = typeof window !== 'undefined' ? localStorage.getItem(`${FALLBACK_PREFIX}has_seeded_schedule`) : null;
  try {
    const dbInst = await openDatabase();
    return new Promise((resolve) => {
      const tx = dbInst.transaction('schedule', 'readonly');
      const store = tx.objectStore('schedule');
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as ScheduleItem[];
        if ((!result || result.length === 0) && !hasSeededSchedule) {
          const txWrite = dbInst.transaction('schedule', 'readwrite');
          const storeWrite = txWrite.objectStore('schedule');
          INITIAL_SCHEDULE.forEach((s) => storeWrite.put(s));
          try {
            localStorage.setItem(`${FALLBACK_PREFIX}has_seeded_schedule`, 'true');
          } catch {}
          resolve(INITIAL_SCHEDULE);
        } else {
          resolve(result || []);
        }
      };
      request.onerror = () => resolve(INITIAL_SCHEDULE);
    });
  } catch {
    return INITIAL_SCHEDULE;
  }
}

export async function saveSchedule(schedule: ScheduleItem[]): Promise<void> {
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('schedule', 'readwrite');
    const store = tx.objectStore('schedule');
    store.clear();
    schedule.forEach((s) => store.put(s));
  } catch (err) {
    console.warn('Erro ao gravar horário:', err);
  }

  if (auth.currentUser) {
    for (const item of schedule) {
      try {
        await setDoc(doc(db, 'schedule', item.id), cleanForFirestore(item));
      } catch (err) {
        // Log without blocking
        console.warn('Erro ao sincronizar aula no Firestore:', err);
      }
    }
  }
}

// ----------------- SETTINGS -----------------

export async function loadSettings(): Promise<AppSettings> {
  // Check Firestore first if logged in
  if (auth.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'app_settings'));
      if (snap.exists()) {
        const cloudSet = snap.data() as Partial<AppSettings>;
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...cloudSet,
          // If the studentName in cloud is still the old Afonso, update to Francisco
          studentName: cloudSet.studentName === 'Afonso' ? 'Francisco' : (cloudSet.studentName || DEFAULT_SETTINGS.studentName),
          allowedEmails: cloudSet.allowedEmails && cloudSet.allowedEmails.length > 0 ? cloudSet.allowedEmails : DEFAULT_SETTINGS.allowedEmails,
        };
        try {
          localStorage.setItem(`${FALLBACK_PREFIX}settings`, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações do Firestore:', err);
    }
  }

  try {
    const dbInst = await openDatabase();
    return new Promise((resolve) => {
      const tx = dbInst.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('app_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          const val = request.result.value as Partial<AppSettings>;
          const merged: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...val,
            studentName: val.studentName === 'Afonso' ? 'Francisco' : (val.studentName || DEFAULT_SETTINGS.studentName),
            allowedEmails: val.allowedEmails && val.allowedEmails.length > 0 ? val.allowedEmails : DEFAULT_SETTINGS.allowedEmails,
          };
          resolve(merged);
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`${FALLBACK_PREFIX}settings`);
      if (raw) {
        const val = JSON.parse(raw) as Partial<AppSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...val,
          studentName: val.studentName === 'Afonso' ? 'Francisco' : (val.studentName || DEFAULT_SETTINGS.studentName),
          allowedEmails: val.allowedEmails && val.allowedEmails.length > 0 ? val.allowedEmails : DEFAULT_SETTINGS.allowedEmails,
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'app_settings', value: settings });
  } catch (err) {
    console.warn('Erro ao gravar configurações:', err);
  }
  try {
    localStorage.setItem(`${FALLBACK_PREFIX}settings`, JSON.stringify(settings));
  } catch {
    // ignore
  }

  if (auth.currentUser) {
    const path = 'settings/app_settings';
    try {
      await setDoc(doc(db, 'settings', 'app_settings'), cleanForFirestore(settings));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

// ----------------- BACKPACK -----------------

export async function loadBackpackItems(dateKey: string): Promise<string[]> {
  // If user is authenticated, query Firestore first
  if (auth.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'backpack', dateKey));
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.items)) {
          try {
            localStorage.setItem(`${FALLBACK_PREFIX}backpack_${dateKey}`, JSON.stringify(data.items));
          } catch {}
          return data.items;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar mochila do Firestore:', err);
    }
  }

  // Fallback to local cache
  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}backpack_${dateKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveBackpackItems(dateKey: string, items: string[]): Promise<void> {
  // 1. Save locally (localStorage & IndexedDB)
  try {
    localStorage.setItem(`${FALLBACK_PREFIX}backpack_${dateKey}`, JSON.stringify(items));
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('backpack', 'readwrite');
    tx.objectStore('backpack').put({ dateKey, items, updatedAt: new Date().toISOString() });
  } catch {
    // ignore
  }

  // 2. Sync to Firebase Firestore
  if (auth.currentUser) {
    const path = `backpack/${dateKey}`;
    try {
      await setDoc(doc(db, 'backpack', dateKey), {
        dateKey,
        items,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.uid,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export function subscribeToFirebaseBackpack(
  dateKey: string,
  onUpdate: (items: string[]) => void
): () => void {
  if (!auth.currentUser) {
    return () => {};
  }

  const path = `backpack/${dateKey}`;
  const docRef = doc(db, 'backpack', dateKey);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const items = Array.isArray(data?.items) ? data.items : [];
        try {
          localStorage.setItem(`${FALLBACK_PREFIX}backpack_${dateKey}`, JSON.stringify(items));
        } catch {}
        onUpdate(items);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

// ----------------- PUSH LOCAL TO FIRESTORE -----------------
export async function pushAllLocalToFirestore(): Promise<{ count: number }> {
  if (!auth.currentUser) throw new Error('Inicia sessão para sincronizar com a nuvem');

  const tomorrowStr = getTomorrowDateStr();
  const [tasks, checkins, schedule, settings, backpack] = await Promise.all([
    loadTasks(),
    loadCheckIns(),
    loadSchedule(),
    loadSettings(),
    loadBackpackItems(tomorrowStr),
  ]);

  let count = 0;
  for (const t of tasks) {
    await setDoc(doc(db, 'tasks', t.id), cleanForFirestore(t));
    count++;
  }
  for (const c of checkins) {
    await setDoc(doc(db, 'checkins', c.id), cleanForFirestore(c));
    count++;
  }
  for (const s of schedule) {
    await setDoc(doc(db, 'schedule', s.id), cleanForFirestore(s));
    count++;
  }
  await setDoc(doc(db, 'settings', 'app_settings'), {
    ...cleanForFirestore(settings),
    isCloudInitialized: true,
    updatedAt: new Date().toISOString(),
  });
  count++;

  if (backpack && backpack.length > 0) {
    await setDoc(doc(db, 'backpack', tomorrowStr), {
      dateKey: tomorrowStr,
      items: backpack,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.uid,
    });
    count++;
  }

  return { count };
}

// ----------------- BACKUP / RESTORE -----------------

export async function exportAllData(): Promise<string> {
  const [tasks, checkins, schedule, settings] = await Promise.all([
    loadTasks(),
    loadCheckIns(),
    loadSchedule(),
    loadSettings(),
  ]);

  const backup = {
    appName: 'Foco 9º B - Agenda Escolar',
    version: '1.0',
    exportDate: new Date().toISOString(),
    tasks,
    checkins,
    schedule,
    settings,
  };

  return JSON.stringify(backup, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Formato inválido de ficheiro de cópia de segurança');
    }

    const dbInst = await openDatabase();

    // Import tasks
    const txTasks = dbInst.transaction('tasks', 'readwrite');
    const storeTasks = txTasks.objectStore('tasks');
    storeTasks.clear();
    for (const t of data.tasks) {
      storeTasks.put(t);
    }

    // Import checkins if present
    if (data.checkins && Array.isArray(data.checkins)) {
      const txCheck = dbInst.transaction('checkins', 'readwrite');
      const storeCheck = txCheck.objectStore('checkins');
      storeCheck.clear();
      for (const c of data.checkins) {
        storeCheck.put(c);
      }
    }

    if (data.settings) {
      await saveSettings(data.settings);
    }

    if (data.schedule && Array.isArray(data.schedule)) {
      await saveSchedule(data.schedule);
    }

    return true;
  } catch (err) {
    console.error('Erro na importação:', err);
    return false;
  }
}

// ----------------- CHECK-IN ALERTS BROADCAST -----------------

// In-memory set of seen alert IDs to prevent duplicate toasts
const seenAlertIds = new Set<string>();

// BroadcastChannel for cross-tab synchronization on the same device/browser
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('foco9b_alerts_channel');
  } catch {
    // ignore
  }
}

export async function loadAlerts(): Promise<CheckInAlert[]> {
  try {
    const dbInst = await openDatabase();
    return new Promise((resolve) => {
      const tx = dbInst.transaction('alerts', 'readonly');
      const store = tx.objectStore('alerts');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as CheckInAlert[]) || [];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list.slice(0, 30));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`${FALLBACK_PREFIX}alerts`);
      const list: CheckInAlert[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list.slice(0, 30);
    } catch {
      return [];
    }
  }
}

export async function saveAlert(alert: CheckInAlert): Promise<void> {
  seenAlertIds.add(alert.id);
  try {
    const dbInst = await openDatabase();
    const tx = dbInst.transaction('alerts', 'readwrite');
    tx.objectStore('alerts').put(alert);
  } catch {
    // fallback
  }

  try {
    const existing = await loadAlerts();
    const updated = [alert, ...existing.filter((a) => a.id !== alert.id)].slice(0, 30);
    localStorage.setItem(`${FALLBACK_PREFIX}alerts`, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Broadcasts a check-in alert to all connected family devices and open tabs
 */
export async function broadcastCheckInAlert(alert: CheckInAlert): Promise<void> {
  // 1. Mark as seen locally to prevent echo toast
  seenAlertIds.add(alert.id);

  // 2. Save locally
  await saveAlert(alert);

  // 3. Broadcast to all open tabs via BroadcastChannel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(alert);
    }
  } catch {
    // ignore
  }

  // 4. If logged in with Firebase, write to Firestore so all family devices receive it via onSnapshot
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'alerts', alert.id), cleanForFirestore(alert));
    } catch (err) {
      console.warn('Aviso ao sincronizar alerta no Firestore:', err);
    }
  }
}

/**
 * Subscribes to real-time check-in alerts from both BroadcastChannel (local tabs)
 * and Firestore (remote family devices).
 */
export function subscribeToRemoteAlerts(
  onAlert: (alert: CheckInAlert) => void
): () => void {
  // Listen to local BroadcastChannel
  const handleBroadcastMessage = (event: MessageEvent) => {
    const alert = event.data as CheckInAlert;
    if (alert && alert.id && !seenAlertIds.has(alert.id)) {
      seenAlertIds.add(alert.id);
      saveAlert(alert);
      onAlert(alert);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // Listen to Firestore real-time alerts if Firebase is available
  let unsubscribeFirestore: (() => void) | null = null;

  try {
    // Listen to alerts collection
    const alertsCol = collection(db, 'alerts');
    const alertsQuery = query(alertsCol, limit(15));

    unsubscribeFirestore = onSnapshot(
      alertsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as CheckInAlert;
            if (data && data.id && !seenAlertIds.has(data.id)) {
              // Only trigger toast if the alert was created recently (within past 2 hours)
              // to avoid spamming historical alerts on first load
              const alertTime = new Date(data.timestamp).getTime();
              const now = Date.now();
              const isRecent = now - alertTime < 2 * 60 * 60 * 1000;

              seenAlertIds.add(data.id);
              saveAlert(data);

              if (isRecent) {
                onAlert(data);
              }
            }
          }
        });
      },
      (error) => {
        // Silently handle if unauthenticated or permissions pending
        // console.info('Alerta Firestore subscription idle:', error.message);
      }
    );
  } catch {
    // ignore
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

