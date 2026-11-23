import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchHiringOpenings,
  fetchOpeningProfiles,
  shortlistCandidateProfile,
  rejectCandidateProfile,
  getHiringProfilePreview,
  clearHiringError,
  clearHiringProfiles,
  clearHiringPreviewUrl,
} from "@/redux/features/Hiring/hiringSlice";

export const useHiring = () => {
  const dispatch = useDispatch();
  const {
    openings,
    currentOpening,
    profiles,
    pagination,
    isLoading,
    actionLoading,
    error,
    previewUrl,
  } = useSelector((state) => state.hiring);

  const getOpenings = useCallback(
    (params) => dispatch(fetchHiringOpenings(params)),
    [dispatch]
  );

  const getProfiles = useCallback(
    (openingId) => dispatch(fetchOpeningProfiles(openingId)),
    [dispatch]
  );

  const shortlist = useCallback(
    (profileId) => dispatch(shortlistCandidateProfile(profileId)),
    [dispatch]
  );

  const reject = useCallback(
    (profileId) => dispatch(rejectCandidateProfile(profileId)),
    [dispatch]
  );

  const fetchPreview = useCallback(
    (profileId) => dispatch(getHiringProfilePreview(profileId)),
    [dispatch]
  );

  const clearError = useCallback(
    () => dispatch(clearHiringError()),
    [dispatch]
  );

  const resetCurrent = useCallback(
    () => dispatch(clearHiringProfiles()),
    [dispatch]
  );

  const clearPreview = useCallback(
    () => dispatch(clearHiringPreviewUrl()),
    [dispatch]
  );

  return {
    openings,
    currentOpening,
    profiles,
    pagination,
    isLoading,
    actionLoading,
    error,
    previewUrl,
    getOpenings,
    getProfiles,
    shortlist,
    reject,
    fetchPreview,
    clearError,
    resetCurrent,
    clearPreview,
  };
};

export default useHiring;
