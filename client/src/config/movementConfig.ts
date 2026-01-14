// Movement key configuration
// Defines the key bindings for player movement with WASD as default

export interface MovementKeys {
  up: string;
  down: string;
  left: string;
  right: string;
}

// Default WASD configuration
export const DEFAULT_MOVEMENT_KEYS: MovementKeys = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd'
};

// Alternative arrow keys configuration (fallback)
export const ARROW_KEYS: MovementKeys = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight'
};

// Load movement keys from localStorage or use default
export function loadMovementKeys(): MovementKeys {
  try {
    const saved = localStorage.getItem('movementKeys');
    if (saved) {
      const parsed = JSON.parse(saved) as MovementKeys;
      // Validate that all required keys exist
      if (parsed.up && parsed.down && parsed.left && parsed.right) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load movement keys from localStorage:', error);
  }
  
  // Fallback to environment variable or default
  try {
    const envKeys = import.meta.env.VITE_MOVEMENT_KEYS;
    if (envKeys) {
      const parsed = JSON.parse(envKeys) as MovementKeys;
      if (parsed.up && parsed.down && parsed.left && parsed.right) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to parse movement keys from environment:', error);
  }
  
  return DEFAULT_MOVEMENT_KEYS;
}

// Save movement keys to localStorage
export function saveMovementKeys(keys: MovementKeys): void {
  try {
    localStorage.setItem('movementKeys', JSON.stringify(keys));
  } catch (error) {
    console.warn('Failed to save movement keys to localStorage:', error);
  }
}

// Get the current movement keys (with caching for performance)
let cachedMovementKeys: MovementKeys | null = null;

export function getMovementKeys(): MovementKeys {
  if (!cachedMovementKeys) {
    cachedMovementKeys = loadMovementKeys();
  }
  return cachedMovementKeys;
}

// Reset movement keys to default
export function resetMovementKeys(): void {
  cachedMovementKeys = null;
  localStorage.removeItem('movementKeys');
}

// Update movement keys and save to localStorage
export function updateMovementKeys(newKeys: Partial<MovementKeys>): MovementKeys {
  const currentKeys = getMovementKeys();
  const updatedKeys = { ...currentKeys, ...newKeys };
  saveMovementKeys(updatedKeys);
  cachedMovementKeys = updatedKeys;
  return updatedKeys;
}