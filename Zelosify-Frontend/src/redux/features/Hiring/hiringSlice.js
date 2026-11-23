import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/Axios/AxiosInstance";

// 1. Fetch Hiring Manager Openings
export const fetchHiringOpenings = createAsyncThunk(
  "hiring/fetchHiringOpenings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/hiring-manager/openings", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch hiring openings"
      );
    }
  }
);

// 2. Fetch Profiles for Opening
export const fetchOpeningProfiles = createAsyncThunk(
  "hiring/fetchOpeningProfiles",
  async (openingId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/hiring-manager/openings/${openingId}/profiles`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profiles for opening"
      );
    }
  }
);

// 3. Shortlist Candidate Profile
export const shortlistCandidateProfile = createAsyncThunk(
  "hiring/shortlistCandidateProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/hiring-manager/profiles/${profileId}/shortlist`
      );
      return { profileId, profile: response.data.profile };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to shortlist profile"
      );
    }
  }
);

// 4. Reject Candidate Profile
export const rejectCandidateProfile = createAsyncThunk(
  "hiring/rejectCandidateProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/hiring-manager/profiles/${profileId}/reject`
      );
      return { profileId, profile: response.data.profile };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reject profile"
      );
    }
  }
);

// 5. Preview Profile
export const getHiringProfilePreview = createAsyncThunk(
  "hiring/getHiringProfilePreview",
  async (profileId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/hiring-manager/profiles/${profileId}/preview`
      );
      return response.data.previewUrl;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get profile preview URL"
      );
    }
  }
);

const initialState = {
  openings: [],
  currentOpening: null,
  profiles: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  isLoading: false,
  actionLoading: {},
  error: null,
  previewUrl: null,
};

const hiringSlice = createSlice({
  name: "hiring",
  initialState,
  reducers: {
    clearHiringError: (state) => {
      state.error = null;
    },
    clearHiringProfiles: (state) => {
      state.currentOpening = null;
      state.profiles = [];
    },
    clearHiringPreviewUrl: (state) => {
      state.previewUrl = null;
    },
  },
  extraReducers: (builder) => {
    // fetchHiringOpenings
    builder
      .addCase(fetchHiringOpenings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHiringOpenings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.openings = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchHiringOpenings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // fetchOpeningProfiles
    builder
      .addCase(fetchOpeningProfiles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOpeningProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOpening = action.payload.opening;
        state.profiles = action.payload.profiles || [];
      })
      .addCase(fetchOpeningProfiles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // shortlistCandidateProfile
    builder
      .addCase(shortlistCandidateProfile.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = true;
      })
      .addCase(shortlistCandidateProfile.fulfilled, (state, action) => {
        delete state.actionLoading[action.payload.profileId];
        const profile = state.profiles.find((p) => p.id === action.payload.profileId);
        if (profile) {
          profile.status = "SHORTLISTED";
        }
      })
      .addCase(shortlistCandidateProfile.rejected, (state, action) => {
        delete state.actionLoading[action.meta.arg];
        state.error = action.payload;
      });

    // rejectCandidateProfile
    builder
      .addCase(rejectCandidateProfile.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = true;
      })
      .addCase(rejectCandidateProfile.fulfilled, (state, action) => {
        delete state.actionLoading[action.payload.profileId];
        const profile = state.profiles.find((p) => p.id === action.payload.profileId);
        if (profile) {
          profile.status = "REJECTED";
        }
      })
      .addCase(rejectCandidateProfile.rejected, (state, action) => {
        delete state.actionLoading[action.meta.arg];
        state.error = action.payload;
      });

    // getHiringProfilePreview
    builder
      .addCase(getHiringProfilePreview.fulfilled, (state, action) => {
        state.previewUrl = action.payload;
      });
  },
});

export const {
  clearHiringError,
  clearHiringProfiles,
  clearHiringPreviewUrl,
} = hiringSlice.actions;

export default hiringSlice.reducer;
