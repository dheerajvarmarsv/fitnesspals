/**
 * Generates a URL for a user's avatar using the UI Avatars service
 * @param nickname The user's nickname
 * @returns A URL string for the avatar image
 */
export const generateAvatarUrl = (nickname: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=random`;
}; 