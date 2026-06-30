import { createSlice } from "@reduxjs/toolkit";

const teamSlice = createSlice({
  name: "teams",
  initialState: [],
  reducers: {
    setTeams: (state, action) => action.payload,
  },
});

export const { setTeams } = teamSlice.actions;
export default teamSlice.reducer;
