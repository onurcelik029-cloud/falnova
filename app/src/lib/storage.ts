import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* depolama kapalıysa bellekte tutulur */
  }
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* yoksay */
  }
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
