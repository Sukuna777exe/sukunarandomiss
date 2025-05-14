import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// List of admin emails
const ADMIN_EMAILS = [
  "sukunadev777@gmail.com",
  "sukunadew@gmail.com"
]

// Special admin avatar configuration
const ADMIN_AVATAR_CONFIG = {
  style: 'adventurer-neutral',
  backgroundColor: ['b6e3f4', 'ffdfbf', 'ffd5dc', 'c0aede'],
  accessories: ['variant01', 'variant02', 'variant03'],
  accessoriesColor: ['50c878', 'ff6b6b', '4a90e2'],
  skinColor: ['f8b788', 'f8d3c4'],
  hairColor: ['0e0e0e', '6a4e35', '85c2c6', 'c9b1bd']
};

export function getSecureAvatarUrl(email: string | null | undefined, seed: string): string {
  if (!email || !isAdminUser(email)) {
    console.log('Regular user avatar for:', email);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }

  console.log('Generating admin avatar for:', email);
  
  // Generate deterministic but unique indices based on seed
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgIndex = seedNum % ADMIN_AVATAR_CONFIG.backgroundColor.length;
  const accIndex = seedNum % ADMIN_AVATAR_CONFIG.accessories.length;
  const accColorIndex = (seedNum + 1) % ADMIN_AVATAR_CONFIG.accessoriesColor.length;
  const skinIndex = (seedNum + 2) % ADMIN_AVATAR_CONFIG.skinColor.length;
  const hairIndex = (seedNum + 3) % ADMIN_AVATAR_CONFIG.hairColor.length;

  const adminAvatarUrl = `https://api.dicebear.com/7.x/${ADMIN_AVATAR_CONFIG.style}/svg`
    + `?seed=${seed}`
    + `&backgroundColor=${ADMIN_AVATAR_CONFIG.backgroundColor[bgIndex]}`
    + `&accessories=${ADMIN_AVATAR_CONFIG.accessories[accIndex]}`
    + `&accessoriesColor=${ADMIN_AVATAR_CONFIG.accessoriesColor[accColorIndex]}`
    + `&skinColor=${ADMIN_AVATAR_CONFIG.skinColor[skinIndex]}`
    + `&hairColor=${ADMIN_AVATAR_CONFIG.hairColor[hairIndex]}`
    + '&eyes=variant26&mouth=variant15';

  console.log('Admin avatar URL:', adminAvatarUrl);
  return adminAvatarUrl;
}

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function getUserRole(email: string | null | undefined): 'admin' | 'dev' | 'user' {
  if (!email) {
    console.log('No email provided to getUserRole');
    return 'user';
  }
  const normalizedEmail = email.toLowerCase();
  console.log('Checking role for email:', normalizedEmail);
  console.log('Admin emails list:', ADMIN_EMAILS);
  console.log('Is admin?', ADMIN_EMAILS.includes(normalizedEmail));
  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    return 'admin';
  }
  return 'user';
}
