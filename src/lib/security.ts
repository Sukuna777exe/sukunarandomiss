// Content Security Policy Configuration
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite/React development
    'https://apis.google.com', // For Firebase/Google services
    'https://www.gstatic.com',
    'https://www.googleapis.com'
  ],
  'style-src': ["'self'", "'unsafe-inline'"], // Required for styled-components
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
    'https://api.dicebear.com', // For avatars
    'https://www.gstatic.com'
  ],
  'media-src': ["'self'", 'blob:'], // For WebRTC media streams
  'connect-src': [
    "'self'",
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'wss://*.firebaseio.com',
    'https://api.dicebear.com'
  ],
  'frame-src': ["'self'", 'https://randomiss-video-verse.firebaseapp.com'],
  'worker-src': ["'self'", 'blob:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"]
};

// Security Headers Configuration
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Generate CSP string from directives
export const generateCSP = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

// Initialize security headers in the application
export const initializeSecurityHeaders = (): void => {
  // Create meta tag for CSP
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = generateCSP();
  document.head.appendChild(cspMeta);

  // Add security headers to service worker if available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'SECURITY_HEADERS',
        headers: SECURITY_HEADERS
      });
    });
  }
};

// Function to validate external URLs
export const isValidExternalURL = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const allowedDomains = [
      'firebaseio.com',
      'googleapis.com',
      'gstatic.com',
      'dicebear.com',
      'randomiss-video-verse.firebaseapp.com'
    ];

    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
  } catch {
    return false;
  }
};

// Function to create a nonce for inline scripts (if needed)
export const generateNonce = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Initialize all security measures
export const initializeSecurity = (): void => {
  // Initialize security headers
  initializeSecurityHeaders();

  // Add event listener for CSP violations
  document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
    console.error('CSP Violation:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    });
  });

  // Prevent clickjacking
  if (window.self !== window.top) {
    window.top.location.href = window.self.location.href;
  }

  // Disable console in production
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
  }
}; 