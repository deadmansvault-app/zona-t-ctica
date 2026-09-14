import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
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
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Authentication helpers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
  const projectId = firebaseConfig.projectId || 'mega-land-h7c1c';
  const settingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  return { hostname, projectId, settingsUrl };
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
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
 * Sign in as a family device / anonymous session.
 * Does NOT require Google OAuth popup or domain authorization.
 * Allows Firestore real-time sync immediately on GitHub Pages and all domains.
 */
export async function signInFamilySync(): Promise<User | null> {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error: any) {
    console.error('Erro no início de sessão anónimo / família:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  try {
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
