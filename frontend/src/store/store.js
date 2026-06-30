import { configureStore } from "@reduxjs/toolkit";
import stockReducer from "./stockSlice";
import teamReducer from "./teamSlice";

const store = configureStore({
  reducer: {
    stocks: stockReducer,
    teams: teamReducer,
  },
});

export default store;
