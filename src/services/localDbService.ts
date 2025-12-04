import { ChatSession } from '../types';

const DB_NAME = 'REXProAIDB';
const DB_VERSION = 2; // Incremented version to add user index
const CHAT_STORE = 'chatHistory';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(CHAT_STORE)) {
                const chatStore = db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
                chatStore.createIndex('by_user', 'userId', { unique: false });
            } else {
                 const chatStore = (event.target as any).transaction.objectStore(CHAT_STORE);
                 if (!chatStore.indexNames.contains('by_user')) {
                    chatStore.createIndex('by_user', 'userId', { unique: false });
                 }
            }
        };
    });
    return dbPromise;
};

const getAllForUser = async <T>(storeName: string, userId: string): Promise<T[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index('by_user');
        const request = index.getAll(userId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
             // Ensure sorting for chat history
            if (storeName === CHAT_STORE && Array.isArray(request.result)) {
                resolve(request.result.sort((a: any, b: any) => b.lastModified - a.lastModified));
            } else {
                resolve(request.result);
            }
        };
    });
};

const saveForUser = async <T extends { id: string; userId?: string }>(storeName: string, item: T, userId: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ ...item, userId });
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve();
    });
};

const deleteById = async (storeName: string, id: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve();
    });
};

const clearStoreForUser = async (storeName: string, userId: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('by_user');
        const request = index.openCursor(IDBKeyRange.only(userId));

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                // When cursor is done, the operation is complete.
                transaction.oncomplete = () => resolve();
            }
        };
    });
};


// Chat History specific functions
export const getChats = (userId: string) => getAllForUser<ChatSession>(CHAT_STORE, userId);
export const saveChat = (chat: ChatSession, userId: string) => saveForUser(CHAT_STORE, chat, userId);
export const deleteChat = (chatId: string) => deleteById(CHAT_STORE, chatId);
export const clearChats = (userId: string) => clearStoreForUser(CHAT_STORE, userId);