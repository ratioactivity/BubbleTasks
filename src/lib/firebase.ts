import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyD2B-iIq3XladToDhiLCH3QkEV8Rfxre7U',
  authDomain: 'bubbletasks-b3966.firebaseapp.com',
  projectId: 'bubbletasks-b3966',
  storageBucket: 'bubbletasks-b3966.firebasestorage.app',
  messagingSenderId: '1029297683077',
  appId: '1:1029297683077:web:ad0ec5fbace8767a0647ec',
  measurementId: 'G-VLJEV00TR2',
};

export const firebaseApp = initializeApp(firebaseConfig);

export const analyticsPromise =
  typeof window !== 'undefined'
    ? isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
    : Promise.resolve(null);
