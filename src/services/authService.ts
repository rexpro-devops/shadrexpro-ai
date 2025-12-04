import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

const USERS_KEY = 'rexpro_users';
const ACTIVE_USER_ID_KEY = 'rexpro_activeUserId';
export const GUEST_USER_ID = 'guest';

// Create a default guest user if none exists
const initializeGuestUser = (): User => {
    return { id: GUEST_USER_ID, name: 'Guest', isGuest: true };
};

export const getAllLocalUsers = (): User[] => {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
};

export const getLocalUser = (userId: string): User | null => {
    if (userId === GUEST_USER_ID) return initializeGuestUser();
    const users = getAllLocalUsers();
    return users.find(u => u.id === userId) || null;
};

export const signUp = (name: string): User => {
    const users = getAllLocalUsers();
    const newUser: User = { id: uuidv4(), name, isGuest: false };
    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    login(newUser.id);
    return newUser;
};

export const login = (userId: string): void => {
    localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
};

export const logout = (): void => {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
};

export const getCurrentUser = (): User | null => {
    const activeUserId = localStorage.getItem(ACTIVE_USER_ID_KEY);
    if (!activeUserId) {
        return null; // No user is logged in, not even as a guest. App should prompt.
    }
    return getLocalUser(activeUserId);
};

export const continueAsGuest = (): User => {
    login(GUEST_USER_ID);
    return initializeGuestUser();
};