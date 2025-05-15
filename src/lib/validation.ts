import DOMPurify from 'dompurify';
import { z } from 'zod';

// Schema definitions for different collections
const schemas: Record<string, z.ZodType<any>> = {
  users: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.string(),
    displayName: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }),
  content: z.object({
    title: z.string().min(1),
    body: z.string(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional()
  })
  // Add more schemas as needed
};

export function sanitizeInput<T extends Record<string, any>>(data: T): T {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Sanitize strings using DOMPurify
      sanitized[key] = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // Strip all HTML tags
        ALLOWED_ATTR: [] // Strip all attributes
      });
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(value);
    } else {
      // Pass through other types unchanged
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

export async function validateSchema(
  collection: string,
  data: Record<string, any>
): Promise<void> {
  const schema = schemas[collection];
  if (!schema) {
    throw new Error(`No schema defined for collection: ${collection}`);
  }

  try {
    await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// NoSQL injection prevention
export function escapeNoSQLQuery(query: Record<string, any>): Record<string, any> {
  const escaped: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'object' && value !== null) {
      escaped[key] = escapeNoSQLQuery(value);
    } else if (typeof value === 'string') {
      // Escape special characters and prevent operator injection
      escaped[key] = value.replace(/[\${}()]/g, '\\$&');
    } else {
      escaped[key] = value;
    }
  }

  return escaped;
}

// Additional validation utilities
export const validation = {
  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  },

  isValidEmail: (email: string): boolean => {
    return z.string().email().safeParse(email).success;
  },

  sanitizeHtml: (html: string, allowedTags: string[] = []): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: []
    });
  }
}; 