import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/Axios/AxiosInstance";

// 1. Fetch Openings
export const fetchVendorOpenings = createAsyncThunk(
  "vendor/fetchVendorOpenings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/vendor/openings", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch vendor openings"
      );
    }
  }
);

// 2. Fetch Opening Details
export const fetchVendorOpeningDetails = createAsyncThunk(
  "vendor/fetchVendorOpeningDetails",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/vendor/openings/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch opening details"
      );
    }
  }
);

// 3. Presign Upload URLs
export const presignProfileUpload = createAsyncThunk(
  "vendor/presignProfileUpload",
  async ({ openingId, filenames }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/vendor/openings/${openingId}/profiles/presign`,
        { filenames }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to generate presigned upload tokens"
      );
    }
  }
);

// 4. Upload Profiles
export const uploadVendorProfiles = createAsyncThunk(
  "vendor/uploadVendorProfiles",
  async ({ openingId, formData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/vendor/openings/${openingId}/profiles/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to upload candidate profiles"
      );
    }
  }
);

// 5. Soft Delete Profile
export const softDeleteProfile = createAsyncThunk(
  "vendor/softDeleteProfile",
  async (profileId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/vendor/profiles/${profileId}`);
      return profileId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete candidate profile"
      );
    }
  }
);

// 6. Preview Profile
export const getProfilePreview = createAsyncThunk(
  "vendor/getProfilePreview",
  async (profileId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/vendor/profiles/${profileId}/preview`);
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
  uploadedProfiles: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  isLoading: false,
  isUploading: false,
  uploadSuccess: false,
  error: null,
  previewUrl: null,
};

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    clearVendorError: (state) => {
      state.error = null;
    },
    clearCurrentOpening: (state) => {
      state.currentOpening = null;
      state.uploadedProfiles = [];
    },
    clearPreviewUrl: (state) => {
      state.previewUrl = null;
    },
    resetUploadState: (state) => {
      state.isUploading = false;
      state.uploadSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchVendorOpenings
    builder
      .addCase(fetchVendorOpenings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorOpenings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.openings = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVendorOpenings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // fetchVendorOpeningDetails
    builder
      .addCase(fetchVendorOpeningDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorOpeningDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOpening = action.payload.opening;
        state.uploadedProfiles = action.payload.uploadedProfiles || [];
      })
      .addCase(fetchVendorOpeningDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // uploadVendorProfiles
    builder
      .addCase(uploadVendorProfiles.pending, (state) => {
        state.isUploading = true;
        state.uploadSuccess = false;
        state.error = null;
      })
      .addCase(uploadVendorProfiles.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadSuccess = true;
        if (action.payload.profiles) {
          state.uploadedProfiles = [
            ...action.payload.profiles,
            ...state.uploadedProfiles,
          ];
        }
      })
      .addCase(uploadVendorProfiles.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadSuccess = false;
        state.error = action.payload;
      });

    // softDeleteProfile
    builder
      .addCase(softDeleteProfile.fulfilled, (state, action) => {
        state.uploadedProfiles = state.uploadedProfiles.filter(
          (p) => p.id !== action.payload
        );
      });

    // getProfilePreview
    builder
      .addCase(getProfilePreview.fulfilled, (state, action) => {
        state.previewUrl = action.payload;
      });
  },
});

export const {
  clearVendorError,
  clearCurrentOpening,
  clearPreviewUrl,
  resetUploadState,
} = vendorSlice.actions;

export default vendorSlice.reducer;
