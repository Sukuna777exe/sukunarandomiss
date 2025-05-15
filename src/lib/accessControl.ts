import { User } from '../types/user';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER'
}

export enum Permission {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_CONTENT = 'MANAGE_CONTENT',
  ACCESS_ADMIN = 'ACCESS_ADMIN',
  ACCESS_API = 'ACCESS_API'
}

const rolePermissions = new Map<Role, Set<Permission>>([
  [Role.USER, new Set([Permission.READ, Permission.WRITE])],
  [Role.ADMIN, new Set([
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CONTENT,
    Permission.ACCESS_ADMIN
  ])],
  [Role.DEVELOPER, new Set([
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CONTENT,
    Permission.ACCESS_ADMIN,
    Permission.ACCESS_API
  ])]
]);

export class AccessControlService {
  private static instance: AccessControlService;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  hasPermission(permission: Permission): boolean {
    if (!this.currentUser || !this.currentUser.role) {
      return false;
    }

    const userPermissions = rolePermissions.get(this.currentUser.role as Role);
    return userPermissions ? userPermissions.has(permission) : false;
  }

  hasRole(role: Role): boolean {
    return this.currentUser?.role === role;
  }

  validateAccess(requiredPermissions: Permission[]): boolean {
    if (!this.currentUser) {
      throw new Error('Authentication required');
    }

    return requiredPermissions.every(permission => this.hasPermission(permission));
  }

  // Resource-level access control
  canAccessResource(resourceOwnerId: string): boolean {
    if (!this.currentUser) return false;
    
    // Admins and developers can access all resources
    if (this.hasRole(Role.ADMIN) || this.hasRole(Role.DEVELOPER)) {
      return true;
    }

    // Users can only access their own resources
    return this.currentUser.id === resourceOwnerId;
  }
}

export const accessControl = AccessControlService.getInstance(); 