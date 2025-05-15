import CryptoJS from 'crypto-js';
import { secureTransport } from './secureTransport';

// Generate a secure encryption key based on user's ID and a secret
const generateEncryptionKey = (userId: string): string => {
  const serverSecret = process.env.REACT_APP_ENCRYPTION_SECRET || 'default-secret-key';
  return CryptoJS.PBKDF2(userId + serverSecret, serverSecret, {
    keySize: 256 / 32,
    iterations: 1000
  }).toString();
};

// Encrypt data with secure transport
export const encryptData = async (data: any, userId: string): Promise<string> => {
  try {
    // Ensure secure session is established
    await secureTransport.establishSecureSession(userId);
    
    // First encrypt with user's key
    const key = generateEncryptionKey(userId);
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    
    // Then encrypt for transport
    const payload = await secureTransport.encryptPayload(encrypted);
    return JSON.stringify(payload);
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

// Decrypt data with secure transport
export const decryptData = async (encryptedData: string, userId: string): Promise<any> => {
  try {
    // Ensure secure session is established
    await secureTransport.establishSecureSession(userId);
    
    // First decrypt the transport layer
    const payload = JSON.parse(encryptedData);
    const transportDecrypted = await secureTransport.decryptPayload(payload);
    
    // Then decrypt with user's key
    const key = generateEncryptionKey(userId);
    const decrypted = CryptoJS.AES.decrypt(transportDecrypted, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Encrypt sensitive fields in an object with secure transport
export const encryptSensitiveData = async (data: any, userId: string): Promise<any> => {
  const sensitiveFields = ['displayName', 'bio', 'email', 'stats', 'lastSeen'];
  const encrypted = { ...data };

  for (const field of sensitiveFields) {
    if (encrypted[field] !== undefined) {
      encrypted[field] = await encryptData(encrypted[field], userId);
    }
  }

  return encrypted;
};

// Decrypt sensitive fields in an object with secure transport
export const decryptSensitiveData = async (data: any, userId: string): Promise<any> => {
  const sensitiveFields = ['displayName', 'bio', 'email', 'stats', 'lastSeen'];
  const decrypted = { ...data };

  for (const field of sensitiveFields) {
    if (decrypted[field] !== undefined) {
      try {
        decrypted[field] = await decryptData(decrypted[field], userId);
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
      }
    }
  }

  return decrypted;
};

// Obfuscate data for console
export const obfuscateForConsole = () => {
  const originalConsole = { ...console };
  const sensitivePatterns = [
    /email/i,
    /displayName/i,
    /bio/i,
    /stats/i,
    /lastSeen/i,
    /profile/i,
    /presence/i,
    /sessionKey/i,  // Added to protect secure transport keys
    /secureTransport/i
  ];

  // Override console methods
  const overrideConsole = (method: 'log' | 'info' | 'warn' | 'error') => {
    console[method] = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          let shouldObfuscate = false;
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(arg)) shouldObfuscate = true;
          });
          return shouldObfuscate ? '[REDACTED]' : arg;
        }
        if (typeof arg === 'object' && arg !== null) {
          return '[OBJECT]';
        }
        return arg;
      });
      originalConsole[method](...sanitizedArgs);
    };
  };

  overrideConsole('log');
  overrideConsole('info');
  overrideConsole('warn');
  overrideConsole('error');
};

// Anti-debugging measures
export const setupAntiDebugging = () => {
  // Detect and prevent DevTools
  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    if (widthThreshold || heightThreshold) {
      document.body.innerHTML = 'Security violation detected.';
      // Destroy secure session on security violation
      secureTransport.destroySession();
    }
  };

  // Prevent right-click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Prevent keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || // DevTools shortcuts
      (e.ctrlKey && e.key === 'U') // View source
    ) {
      e.preventDefault();
      // Destroy secure session on security violation
      secureTransport.destroySession();
    }
  });

  // Regular check for DevTools
  setInterval(detectDevTools, 1000);

  // Prevent source map loading
  if (process.env.NODE_ENV === 'production') {
    Error.stackTraceLimit = 0;
    window.console = Object.freeze(Object.create(null));
  }
}; 