import DOMPurify from 'dompurify';

// Regular expressions for validation
const PATTERNS = {
  displayName: /^[a-zA-Z0-9\s_-]{3,30}$/,
  bio: /^[\w\s.,!?()-]{0,150}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: /^[\w\s.,!?()-]{1,500}$/
};

interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

// Sanitize HTML content
export const sanitizeHTML = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    ALLOW_DATA_ATTR: false,
    USE_PROFILES: { html: false }
  });
};

// Sanitize and validate display names
export const sanitizeDisplayName = (input: string): ValidationResult => {
  const sanitized = sanitizeHTML(input.trim());
  
  if (!PATTERNS.displayName.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Display name must be 3-30 characters and contain only letters, numbers, spaces, underscores, and hyphens'
    };
  }

  return {
    isValid: true,
    sanitized
  };
};

// Sanitize and validate bio text
export const sanitizeBio = (input: string): ValidationResult => {
  const sanitized = sanitizeHTML(input.trim());
  
  if (!PATTERNS.bio.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Bio must be under 150 characters and contain only letters, numbers, spaces, and basic punctuation'
    };
  }

  return {
    isValid: true,
    sanitized
  };
};

// Sanitize and validate email addresses
export const sanitizeEmail = (input: string): ValidationResult => {
  const sanitized = sanitizeHTML(input.trim().toLowerCase());
  
  if (!PATTERNS.email.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true,
    sanitized
  };
};

// Sanitize and validate chat messages
export const sanitizeMessage = (input: string): ValidationResult => {
  const sanitized = sanitizeHTML(input.trim());
  
  if (!PATTERNS.message.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Message must be 1-500 characters and contain only letters, numbers, spaces, and basic punctuation'
    };
  }

  return {
    isValid: true,
    sanitized
  };
};

// NoSQL injection prevention for Firebase
export const sanitizeFirebaseKey = (key: string): string => {
  return key.replace(/[.#$/\[\]]/g, '_');
};

// Sanitize object for Firebase storage
export const sanitizeFirebaseObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const sanitizedKey = sanitizeFirebaseKey(key);
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeHTML(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = sanitizeFirebaseObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
  }

  return sanitized;
};

// Validate and sanitize URL parameters
export const sanitizeURLParams = (params: URLSearchParams): URLSearchParams => {
  const sanitized = new URLSearchParams();
  
  for (const [key, value] of params.entries()) {
    const sanitizedKey = sanitizeHTML(key);
    const sanitizedValue = sanitizeHTML(value);
    sanitized.append(sanitizedKey, sanitizedValue);
  }
  
  return sanitized;
};

// Content Security Policy violation reporter
export const reportCSPViolation = (violation: SecurityPolicyViolationEvent): void => {
  console.error('CSP Violation:', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    originalPolicy: violation.originalPolicy
  });
  
  // You can send this to your analytics or logging service
  // For now, we'll just log it
};

// Initialize security event listeners
export const initializeSecurityListeners = (): void => {
  document.addEventListener('securitypolicyviolation', reportCSPViolation);
}; 