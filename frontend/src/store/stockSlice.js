import { createSlice } from "@reduxjs/toolkit";

const stockSlice = createSlice({
  name: "stocks",
  initialState: [],
  reducers: {
    setStocks: (state, action) => action.payload,
  },
});

export const { setStocks } = stockSlice.actions;
export default stockSlice.reducer;
