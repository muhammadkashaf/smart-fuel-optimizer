import { createContext } from 'react';

export const NotificationContext = createContext<{ onCountChange: (count: number) => void }>({
  onCountChange: () => {},
});
