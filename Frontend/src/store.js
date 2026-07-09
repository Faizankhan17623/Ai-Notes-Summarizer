import { configureStore } from '@reduxjs/toolkit'
import rootReducers from './reducer/index.js'

// separate module sir so both main.jsx and apiConnector.js can import the store
// without risking a circular import (main.jsx -> App.jsx -> ...-> apiConnector.js -> main.jsx)
export const store = configureStore({
  reducer: rootReducers
})
