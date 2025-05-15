import { encryptionService } from './encryption';
import { accessControl, Permission } from './accessControl';
import { sanitizeInput, validateSchema } from './validation';

interface DataOperationOptions {
  requireEncryption?: boolean;
  requiredPermissions?: Permission[];
  validateSchema?: boolean;
  sanitize?: boolean;
}

interface BaseDocument {
  id: string;
  createdAt: Date;
  createdBy: string;
  version: number;
}

interface SensitiveData {
  [key: string]: string | number | boolean | object | null;
}

export class SecureDataService {
  private static instance: SecureDataService;

  private constructor() {}

  static getInstance(): SecureDataService {
    if (!SecureDataService.instance) {
      SecureDataService.instance = new SecureDataService();
    }
    return SecureDataService.instance;
  }

  async create<T extends SensitiveData>(
    collection: string,
    data: T,
    options: DataOperationOptions = {}
  ): Promise<T & BaseDocument> {
    try {
      // Validate permissions
      if (options.requiredPermissions) {
        if (!accessControl.validateAccess(options.requiredPermissions)) {
          throw new Error('Insufficient permissions');
        }
      }

      // Sanitize input
      let processedData = options.sanitize ? sanitizeInput(data) : data;

      // Validate schema
      if (options.validateSchema) {
        await validateSchema(collection, processedData);
      }

      // Encrypt sensitive fields if required
      if (options.requireEncryption) {
        processedData = await this.encryptSensitiveFields(processedData);
      }

      // Add metadata
      const metadata: BaseDocument = {
        id: this.generateId(),
        createdAt: new Date(),
        createdBy: accessControl.getCurrentUser()?.id || 'system',
        version: 1
      };

      // Store in database
      const result = await this.storeInDatabase(collection, {
        ...processedData,
        ...metadata
      });

      return result as T & BaseDocument;
    } catch (error) {
      console.error('Secure data creation failed:', error);
      throw new Error('Failed to create data securely');
    }
  }

  async read<T extends BaseDocument & SensitiveData>(
    collection: string,
    id: string,
    options: DataOperationOptions = {}
  ): Promise<T | null> {
    try {
      // Validate permissions
      if (options.requiredPermissions) {
        if (!accessControl.validateAccess(options.requiredPermissions)) {
          throw new Error('Insufficient permissions');
        }
      }

      // Retrieve from database
      const data = await this.retrieveFromDatabase<T>(collection, id);

      if (!data) return null;

      // Check resource-level access
      if (!accessControl.canAccessResource(data.createdBy)) {
        throw new Error('Access denied to this resource');
      }

      // Decrypt sensitive fields if necessary
      if (options.requireEncryption) {
        return this.decryptSensitiveFields(data);
      }

      return data;
    } catch (error) {
      console.error('Secure data retrieval failed:', error);
      throw new Error('Failed to retrieve data securely');
    }
  }

  private async encryptSensitiveFields<T extends SensitiveData>(
    data: T
  ): Promise<T> {
    const sensitiveFields = this.getSensitiveFields();
    const encrypted = { ...data } as T;

    for (const field of sensitiveFields) {
      if (field in data && data[field] !== undefined) {
        encrypted[field] = await encryptionService.encrypt(
          JSON.stringify(data[field])
        );
      }
    }

    return encrypted;
  }

  private async decryptSensitiveFields<T extends SensitiveData>(
    data: T
  ): Promise<T> {
    const sensitiveFields = this.getSensitiveFields();
    const decrypted = { ...data } as T;

    for (const field of sensitiveFields) {
      if (field in data && data[field] !== undefined) {
        const decryptedValue = await encryptionService.decrypt(data[field] as string);
        decrypted[field] = JSON.parse(decryptedValue);
      }
    }

    return decrypted;
  }

  private getSensitiveFields(): string[] {
    return [
      'password',
      'securityQuestions',
      'personalInfo',
      'paymentDetails',
      'apiKeys'
    ];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Database operation stubs - implement these based on your database choice
  private async storeInDatabase<T>(
    collection: string,
    data: T
  ): Promise<T> {
    // Implement your database storage logic here
    throw new Error('Database storage not implemented');
  }

  private async retrieveFromDatabase<T extends BaseDocument>(
    collection: string,
    id: string
  ): Promise<T | null> {
    // Implement your database retrieval logic here
    throw new Error('Database retrieval not implemented');
  }
}

export const secureDataService = SecureDataService.getInstance(); 