import CryptoJS from 'crypto-js';

interface EncryptedPayload {
  iv: string;
  data: string;
  timestamp: number;
  signature: string;
}

class SecureTransport {
  private static instance: SecureTransport;
  private sessionKey: string | null = null;
  private serverPublicKey: string | null = null;

  private constructor() {
    // Initialize with a temporary session key
    this.sessionKey = this.generateTemporaryKey();
  }

  public static getInstance(): SecureTransport {
    if (!SecureTransport.instance) {
      SecureTransport.instance = new SecureTransport();
    }
    return SecureTransport.instance;
  }

  private generateTemporaryKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private generateIV(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  private generateSignature(data: string, timestamp: number): string {
    if (!this.sessionKey) throw new Error('Session key not initialized');
    const message = `${data}${timestamp}`;
    return CryptoJS.HmacSHA256(message, this.sessionKey).toString();
  }

  private verifySignature(data: string, timestamp: number, signature: string): boolean {
    if (!this.sessionKey) return false;
    const expectedSignature = this.generateSignature(data, timestamp);
    return expectedSignature === signature;
  }

  public async encryptPayload(data: any): Promise<EncryptedPayload> {
    if (!this.sessionKey) throw new Error('Session key not initialized');

    const timestamp = Date.now();
    const iv = this.generateIV();
    const jsonData = JSON.stringify(data);

    // Encrypt the data using AES-CBC with PKCS7 padding
    const encrypted = CryptoJS.AES.encrypt(jsonData, this.sessionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const encryptedData = encrypted.toString();
    const signature = this.generateSignature(encryptedData, timestamp);

    return {
      iv,
      data: encryptedData,
      timestamp,
      signature
    };
  }

  public async decryptPayload(payload: EncryptedPayload): Promise<any> {
    if (!this.sessionKey) throw new Error('Session key not initialized');

    // Verify timestamp to prevent replay attacks (5 minute window)
    const now = Date.now();
    if (now - payload.timestamp > 300000) { // 5 minutes
      throw new Error('Payload expired');
    }

    // Verify signature
    if (!this.verifySignature(payload.data, payload.timestamp, payload.signature)) {
      throw new Error('Invalid signature');
    }

    // Decrypt the data using AES-CBC with PKCS7 padding
    const decrypted = CryptoJS.AES.decrypt(payload.data, this.sessionKey, {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  }

  public async establishSecureSession(userId: string): Promise<void> {
    try {
      // Generate a new session key
      const newSessionKey = this.generateTemporaryKey();
      
      // Encrypt the session key with the user's key
      const encryptedKey = CryptoJS.AES.encrypt(newSessionKey, userId).toString();
      
      // Store the new session key
      this.sessionKey = newSessionKey;

      // In a real-world scenario, we would perform a key exchange with the server here
      // For now, we'll simulate it by storing the encrypted key
      localStorage.setItem('secureSessionKey', encryptedKey);
    } catch (error) {
      console.error('Error establishing secure session:', error);
      throw error;
    }
  }

  public async secureRequest(endpoint: string, method: string, data?: any): Promise<any> {
    try {
      if (!this.sessionKey) {
        throw new Error('No secure session established');
      }

      const payload = data ? await this.encryptPayload(data) : null;
      const headers = {
        'Content-Type': 'application/json',
        'X-Secure-Transport': 'true',
        'X-Timestamp': Date.now().toString()
      };

      const response = await fetch(endpoint, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
        credentials: 'include' // Include cookies for session management
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const encryptedResponse = await response.json();
      return await this.decryptPayload(encryptedResponse);
    } catch (error) {
      console.error('Secure request failed:', error);
      throw error;
    }
  }

  public destroySession(): void {
    this.sessionKey = null;
    this.serverPublicKey = null;
    localStorage.removeItem('secureSessionKey');
  }
}

export const secureTransport = SecureTransport.getInstance(); 