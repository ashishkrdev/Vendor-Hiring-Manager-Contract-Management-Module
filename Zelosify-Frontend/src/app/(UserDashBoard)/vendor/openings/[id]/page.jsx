"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/link";
import { useDropzone } from "react-dropzone";
import { useVendor } from "@/hooks/Vendor/useVendor";
import {
  Briefcase,
  MapPin,
  Clock,
  User,
  UploadCloud,
  File,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
} from "lucide-react";

export default function VendorOpeningDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const {
    currentOpening,
    uploadedProfiles,
    isLoading,
    isUploading,
    uploadSuccess,
    error,
    previewUrl,
    getOpeningDetails,
    uploadProfiles,
    deleteProfile,
    fetchPreview,
    clearPreview,
    resetUpload,
  } = useVendor();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    if (id) {
      getOpeningDetails(id);
    }
    return () => {
      resetUpload();
    };
  }, [id, getOpeningDetails, resetUpload]);

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
    },
    multiple: true,
  });

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 || !id) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    await uploadProfiles({ openingId: id, formData });
    setSelectedFiles([]);
    // Refresh details
    getOpeningDetails(id);
  };

  const handleDeleteProfile = async (profileId) => {
    await deleteProfile(profileId);
    setDeleteConfirmation(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-10 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Title */}
        <div>
          <button
            onClick={() => router.push("/vendor/openings")}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Openings
          </button>

          {isLoading && !currentOpening ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : currentOpening ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {currentOpening.title}
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Managed by <span className="font-semibold">{currentOpening.hiringManagerName}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    {currentOpening.contractType || "Contract"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {currentOpening.status || "OPEN"}
                  </span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-sm">
                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Location</span>
                  <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    {currentOpening.location || "Remote"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Experience</span>
                  <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                    <Briefcase className="w-4 h-4 text-neutral-400" />
                    {currentOpening.experienceRange?.min} - {currentOpening.experienceRange?.max || "Any"} yrs
                  </div>
                </div>

                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Posted Date</span>
                  <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    {currentOpening.postedDate
                      ? new Date(currentOpening.postedDate).toLocaleDateString()
                      : "Recent"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Your Submissions</span>
                  <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                    <User className="w-4 h-4 text-neutral-400" />
                    {uploadedProfiles.length} Candidates
                  </div>
                </div>
              </div>

              {currentOpening.description && (
                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Opening Description & Requirements
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                    {currentOpening.description}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Upload Section (Drag & Drop + Multiple Upload) */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Submit Candidate Profiles
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Supported formats: PDF, PPTX. You can drop multiple candidate files at once.
              </p>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {isDragActive ? "Drop the resumes here..." : "Drag & drop candidate files here, or click to browse"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Supports .pdf and .pptx resumes up to 25MB each
            </p>
          </div>

          {/* Staged Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Staged for upload ({selectedFiles.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                        {file.name}
                      </span>
                      <span className="text-xs text-neutral-400">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeSelectedFile(idx)}
                      className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={isUploading}
                  onClick={handleUploadSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading & Submitting...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Submit {selectedFiles.length} Profile(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Profiles successfully submitted!
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Uploaded Profiles List */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Submitted Candidates ({uploadedProfiles.length})
            </h2>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Only visible to your vendor account
            </span>
          </div>

          {uploadedProfiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No candidates submitted for this opening yet.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {uploadedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <File className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {profile.filename}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Submitted on {new Date(profile.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.status === "SHORTLISTED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : profile.status === "REJECTED"
                          ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {profile.status}
                    </span>

                    {/* Preview Button */}
                    <button
                      onClick={() => fetchPreview(profile.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    {/* Soft Delete Button */}
                    <button
                      onClick={() => setDeleteConfirmation(profile.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Confirm Deletion
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Are you sure you want to delete this submitted candidate profile?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProfile(deleteConfirmation)}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-4xl w-full h-[85vh] flex flex-col space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Candidate Profile Preview
                </h3>
                <button
                  onClick={clearPreview}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 w-full bg-neutral-100 dark:bg-neutral-950 rounded-xl overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Profile Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
