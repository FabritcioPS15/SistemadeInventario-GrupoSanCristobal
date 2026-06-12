import { configureStore } from '@reduxjs/toolkit';
import { reducer as notificationsReducer } from 'reapop';

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer(),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Reapop actions/state might sometimes contain non-serializable values (like callback functions or components in custom buttons)
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
