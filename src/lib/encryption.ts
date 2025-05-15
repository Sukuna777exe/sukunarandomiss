import { Buffer } from 'buffer';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly tagLength = 16; // 128 bits authentication tag

  // Encryption key should be stored securely and rotated periodically
  private async getEncryptionKey(): Promise<Buffer> {
    // In production, this should be fetched from a secure key management service
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('Encryption key not found');
    return Buffer.from(key, 'base64');
  }

  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv, {
        authTagLength: this.tagLength
      });

      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData
      return Buffer.concat([iv, authTag, encrypted]).toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const data = Buffer.from(encryptedData, 'base64');

      const iv = data.slice(0, this.ivLength);
      const authTag = data.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = data.slice(this.ivLength + this.tagLength);

      const decipher = createDecipheriv(this.algorithm, key, iv, {
        authTagLength: this.tagLength
      });
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
}

export const encryptionService = new EncryptionService(); 