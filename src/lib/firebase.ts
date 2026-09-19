import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { AppUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Local Session Persistence Key
export const LOCAL_USER_KEY = 'foco_9b_local_user_session';

export function getLocalUserSession(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalUserSession(user: AppUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch {}
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (works with '(default)', empty, or custom databaseId)
const customDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId;
export const db =
  customDbId && customDbId !== '(default)'
    ? getFirestore(app, customDbId)
    : getFirestore(app);
export const auth = getAuth(app);

// Workspace integration scopes (used exclusively for Google Calendar event sync)
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// 1. Standard Google Auth Provider (basic profile & email, zero friction for login)
const standardGoogleProvider = new GoogleAuthProvider();
standardGoogleProvider.setCustomParameters({ prompt: 'select_account' });

// 2. Calendar Google Auth Provider (specifically for Google Calendar integration)
const calendarGoogleProvider = new GoogleAuthProvider();
calendarGoogleProvider.setCustomParameters({ prompt: 'select_account' });
SCOPES.forEach((scope) => calendarGoogleProvider.addScope(scope));

// In-memory token cache for Google Workspace APIs (per security guidelines, never in localStorage)
let cachedAccessToken: string | null = null;

export function getCachedGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedGoogleAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export interface FirebaseAuthErrorInfo {
  code: string;
  message: string;
  isUnauthorizedDomain?: boolean;
  isPopupBlocked?: boolean;
  hostname: string;
  projectId: string;
  settingsUrl: string;
}

export function getCurrentDomainAuthInfo(): {
  hostname: string;
  projectId: string;
  settingsUrl: string;
} {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const projectId = firebaseConfig.projectId || 'gen-lang-client-0597083680';
  const settingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  return { hostname, projectId, settingsUrl };
}

export async function signInWithGoogle(withCalendarScopes: boolean = false): Promise<User | null> {
  const provider = withCalendarScopes ? calendarGoogleProvider : standardGoogleProvider;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    saveLocalUserSession(null);
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || String(error);

    // User cancelled, closed the popup, or denied consent — this is expected user behavior
    if (
      errorCode === 'auth/user-cancelled' ||
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMessage.includes('auth/user-cancelled') ||
      errorMessage.includes('auth/popup-closed-by-user') ||
      errorMessage.includes('user-cancelled')
    ) {
      console.info('Início de sessão com Google cancelado pelo utilizador.');
      return null;
    }

    const { hostname, projectId, settingsUrl } = getCurrentDomainAuthInfo();
    const isUnauthorized =
      errorCode === 'auth/unauthorized-domain' ||
      errorMessage.toLowerCase().includes('unauthorized-domain') ||
      errorMessage.toLowerCase().includes('not authorized for oauth operations');
    const isPopupBlocked =
      errorCode === 'auth/popup-blocked' ||
      errorMessage.toLowerCase().includes('popup-blocked');

    const authError: FirebaseAuthErrorInfo = {
      code: errorCode,
      message: errorMessage,
      isUnauthorizedDomain: isUnauthorized,
      isPopupBlocked: isPopupBlocked,
      hostname,
      projectId,
      settingsUrl,
    };

    console.warn('Erro no início de sessão com Google:', authError);
    throw authError;
  }
}

/**
 * Sign in as a family device / direct session.
 * Tries Firebase anonymous authentication first; if disabled in console or domain blocked,
 * creates a reliable local session immediately so the user is NEVER blocked from their app.
 */
export async function signInFamilySync(): Promise<User | AppUser> {
  try {
    const cred = await signInAnonymously(auth);
    saveLocalUserSession(null);
    return cred.user;
  } catch (error: any) {
    console.warn('Início de sessão anónimo no Firebase falhou ou está restrito. A usar sessão direta:', error?.message || error);
    const localUser: AppUser = {
      uid: 'familia-9b-direct',
      displayName: 'Família 9º B (Modo Direto)',
      email: 'familia@foco9b.escola',
      isAnonymous: true,
    };
    saveLocalUserSession(localUser);
    return localUser;
  }
}

/**
 * Direct student entry without requiring any external accounts.
 */
export function startDirectStudentSession(): AppUser {
  const studentUser: AppUser = {
    uid: 'francisco-aluno-9b',
    displayName: 'Francisco (9º B)',
    email: 'francisco@escola-sede.pt',
    isAnonymous: true,
  };
  saveLocalUserSession(studentUser);
  return studentUser;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error: any) {
    console.warn('Erro no login por email:', error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name && name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return cred.user;
  } catch (error: any) {
    console.warn('Erro no registo por email:', error);
    throw error;
  }
}

export function translateAuthError(error: any): string {
  const code = error?.code || '';
  const msg = error?.message || String(error);

  if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
    return 'O endereço de email introduzido não é válido.';
  }
  if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
    return 'Não foi encontrada nenhuma conta com este email.';
  }
  if (code === 'auth/wrong-password' || msg.includes('wrong-password') || code === 'auth/invalid-credential') {
    return 'Email ou palavra-passe incorretos.';
  }
  if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
    return 'Já existe uma conta registada com este email. Tente iniciar sessão.';
  }
  if (code === 'auth/weak-password' || msg.includes('weak-password')) {
    return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'A janela de autenticação foi bloqueada pelo navegador. Permita popups ou use o Modo Família.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return 'Este domínio ainda precisa de ser adicionado no Firebase Console. Utilize o Modo Família para sincronizar já.';
  }
  return msg || 'Ocorreu um erro ao processar a autenticação.';
}

export async function logOut(): Promise<void> {
  try {
    cachedAccessToken = null;
    saveLocalUserSession(null);
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.warn('Aviso ao terminar sessão:', error?.message || error);
  }
}

// Structured error handling as mandated by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: When the application initially boots, call getFromServer to test connection
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Call test connection on boot
testConnection().catch(() => {});
