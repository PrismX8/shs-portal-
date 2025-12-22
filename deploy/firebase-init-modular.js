// Initialize Firebase using modular SDK (v9+)
// This file is loaded as a module script

console.log('🔥 Firebase initialization script loading...');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmw916mVYnp3dY5Co-NJtQX9x7MR1njio",
  authDomain: "nebulo-2df14.firebaseapp.com",
  projectId: "nebulo-2df14",
  storageBucket: "nebulo-2df14.firebasestorage.app",
  messagingSenderId: "913886493562",
  appId: "1:913886493562:web:c7e8d4db2bdaffed8934c3",
  measurementId: "G-CJLDJJCJX6",
  databaseURL: "https://nebulo-2df14-default-rtdb.firebaseio.com"
};

// Import Firebase functions from CDN
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { 
  getDatabase, 
  ref, 
  onValue, 
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  set,
  update,
  remove,
  get,
  onDisconnect as getOnDisconnect,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js';

console.log('🔥 Firebase modules imported');

// Create a compatibility wrapper for refs to match the old API
function createCompatRef(dbRef, db, pathString = null) {
  // Extract path from ref if not provided
  if (!pathString) {
    try {
      const refStr = dbRef.toString();
      const match = refStr.match(/firebaseio\.com\/(.+)$/);
      pathString = match ? match[1] : '';
    } catch (e) {
      pathString = '';
    }
  }
  
  return {
    _ref: dbRef,
    _db: db,
    _path: pathString,
    
    child: (path) => {
      const newPath = pathString ? `${pathString}/${path}` : path;
      return createCompatRef(ref(db, newPath), db, newPath);
    },
    
    set: (value) => set(dbRef, value),
    update: (updates) => update(dbRef, updates),
    remove: () => remove(dbRef),
    
    once: (eventType = 'value') => {
      return get(dbRef).then(snapshot => ({
        val: () => snapshot.val(),
        exists: () => snapshot.exists(),
        key: snapshot.key,
        numChildren: () => {
          const val = snapshot.val();
          return val && typeof val === 'object' ? Object.keys(val).length : 0;
        },
        forEach: (callback) => {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.keys(val).forEach(key => {
              callback({
                val: () => val[key],
                key: key,
                exists: () => val[key] !== undefined && val[key] !== null
              });
            });
          }
        }
      }));
    },
    
    on: (eventType, callback, cancelCallback) => {
      let unsubscribe;
      const compatCallback = (snapshot) => {
        // Ensure snapshot.key is available (modular SDK provides it)
        const compatSnapshot = {
          val: () => snapshot.val(),
          exists: () => snapshot.exists(),
          key: snapshot.key || null,
          numChildren: () => {
            const val = snapshot.val();
            return val && typeof val === 'object' ? Object.keys(val).length : 0;
          },
          forEach: (cb) => {
            const val = snapshot.val();
            if (val && typeof val === 'object') {
              Object.keys(val).forEach(key => cb({
                val: () => val[key],
                key: key,
                exists: () => val[key] !== undefined && val[key] !== null
              }));
            }
          }
        };
        callback(compatSnapshot);
      };
      
      if (eventType === 'value') {
        unsubscribe = onValue(dbRef, compatCallback, cancelCallback);
      } else if (eventType === 'child_added') {
        unsubscribe = onChildAdded(dbRef, compatCallback, cancelCallback);
      } else if (eventType === 'child_changed') {
        unsubscribe = onChildChanged(dbRef, compatCallback, cancelCallback);
      } else if (eventType === 'child_removed') {
        unsubscribe = onChildRemoved(dbRef, compatCallback, cancelCallback);
      }
      // Store unsubscribe function on the ref for compatibility with .off() calls
      if (!dbRef._unsubscribes) dbRef._unsubscribes = [];
      dbRef._unsubscribes.push({ eventType, unsubscribe });
      return unsubscribe;
    },
    
    off: (eventType, callback) => {
      // In modular SDK, we call the unsubscribe function directly
      // The unsubscribe function is stored when on() is called
      if (this._ref && this._ref._unsubscribes) {
        const toRemove = this._ref._unsubscribes.filter(u => u.eventType === eventType);
        toRemove.forEach(({ unsubscribe }) => {
          try {
            unsubscribe();
          } catch (e) {
            console.warn('Error unsubscribing:', e);
          }
        });
        this._ref._unsubscribes = this._ref._unsubscribes.filter(u => u.eventType !== eventType);
      }
    },
    
    transaction: (updateFunction) => {
      return get(dbRef).then(snapshot => {
        const currentValue = snapshot.val();
        const newValue = updateFunction(currentValue);
        if (newValue !== undefined && newValue !== null) {
          return set(dbRef, newValue).then(() => ({
            committed: true,
            snapshot: snapshot
          }));
        }
        return { committed: false, snapshot: snapshot };
      });
    },
    
    onDisconnect: () => {
      const disconnectRef = getOnDisconnect(dbRef);
      return {
        set: (value) => disconnectRef.set(value),
        update: (updates) => disconnectRef.update(updates),
        remove: () => disconnectRef.remove(),
        cancel: () => disconnectRef.cancel()
      };
    },
    
    toString: () => dbRef.toString(),
    key: dbRef.key
  };
}

try {
  console.log('🔥 Starting Firebase initialization...');
  
  // Check if already initialized
  let app;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log('🔥 Firebase app already exists, using existing instance');
  } else {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Created new Firebase app instance');
  }
  
  const analytics = getAnalytics(app);
  const db = getDatabase(app);
  console.log('🔥 Firebase database instance obtained');
  
  // Create a compatibility wrapper for db.ref() syntax (used by existing code)
  const dbWrapper = {
    ref: (path) => createCompatRef(ref(db, path), db, path),
    _db: db
  };
  
  // Make Firebase available globally
  window.firebaseApp = app;
  window.firebaseDb = dbWrapper;
  window.firebaseDbNative = db;
  window.firebaseAnalytics = analytics;
  window.firebaseRef = ref;
  window.firebaseOnValue = onValue;
  window.firebaseGetDatabase = getDatabase;
  window.firebaseServerTimestamp = serverTimestamp;
  
  console.log('✅ Firebase initialized successfully', { 
    app, 
    db,
    databaseURL: firebaseConfig.databaseURL,
    hasRef: typeof dbWrapper.ref === 'function',
    firebaseDbSet: !!window.firebaseDb
  });
  
  // Test database connection
  try {
    const testRef = ref(db, '.info/connected');
    onValue(testRef, (snap) => {
      console.log('🔥 Firebase connection status:', snap.val());
    });
  } catch (err) {
    console.warn('Firebase connection test failed:', err);
  }
  
  // Dispatch event so other scripts know Firebase is ready
  window.dispatchEvent(new CustomEvent('firebaseReady', { detail: { app, db: dbWrapper, dbNative: db } }));
  console.log('🔥 Firebase ready event dispatched');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
  window.firebaseInitError = error;
}

