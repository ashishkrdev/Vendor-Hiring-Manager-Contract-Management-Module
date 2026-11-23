import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchVendorOpenings,
  fetchVendorOpeningDetails,
  presignProfileUpload,
  uploadVendorProfiles,
  softDeleteProfile,
  getProfilePreview,
  clearVendorError,
  clearCurrentOpening,
  clearPreviewUrl,
  resetUploadState,
} from "@/redux/features/Vendor/vendorSlice";

export const useVendor = () => {
  const dispatch = useDispatch();
  const {
    openings,
    currentOpening,
    uploadedProfiles,
    pagination,
    isLoading,
    isUploading,
    uploadSuccess,
    error,
    previewUrl,
  } = useSelector((state) => state.vendor);

  const getOpenings = useCallback(
    (params) => dispatch(fetchVendorOpenings(params)),
    [dispatch]
  );

  const getOpeningDetails = useCallback(
    (id) => dispatch(fetchVendorOpeningDetails(id)),
    [dispatch]
  );

  const presignUpload = useCallback(
    (data) => dispatch(presignProfileUpload(data)),
    [dispatch]
  );

  const uploadProfiles = useCallback(
    (data) => dispatch(uploadVendorProfiles(data)),
    [dispatch]
  );

  const deleteProfile = useCallback(
    (profileId) => dispatch(softDeleteProfile(profileId)),
    [dispatch]
  );

  const fetchPreview = useCallback(
    (profileId) => dispatch(getProfilePreview(profileId)),
    [dispatch]
  );

  const clearError = useCallback(
    () => dispatch(clearVendorError()),
    [dispatch]
  );

  const resetCurrent = useCallback(
    () => dispatch(clearCurrentOpening()),
    [dispatch]
  );

  const clearPreview = useCallback(
    () => dispatch(clearPreviewUrl()),
    [dispatch]
  );

  const resetUpload = useCallback(
    () => dispatch(resetUploadState()),
    [dispatch]
  );

  return {
    openings,
    currentOpening,
    uploadedProfiles,
    pagination,
    isLoading,
    isUploading,
    uploadSuccess,
    error,
    previewUrl,
    getOpenings,
    getOpeningDetails,
    presignUpload,
    uploadProfiles,
    deleteProfile,
    fetchPreview,
    clearError,
    resetCurrent,
    clearPreview,
    resetUpload,
  };
};

export default useVendor;
