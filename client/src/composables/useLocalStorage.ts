
import { ref, watch, type Ref } from 'vue';

export function useLocalStorage<T>(key: string, initialValue: T): Ref<T> {
  // Try to load from local storage
  const storedValue = localStorage.getItem(key);
  let parsedValue: T;

  if (storedValue) {
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (e) {
      console.warn(`Error parsing local storage key "${key}":`, e);
      parsedValue = initialValue;
    }
  } else {
    parsedValue = initialValue;
  }

  const data = ref<T>(parsedValue) as Ref<T>;

  // Watch for changes and update local storage
  watch(
    data,
    (newValue) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (e) {
        console.warn(`Error saving to local storage key "${key}":`, e);
      }
    },
    { deep: true }
  );

  return data;
}
