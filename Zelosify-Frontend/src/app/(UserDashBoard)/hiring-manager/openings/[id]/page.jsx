"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/link";
import { useHiring } from "@/hooks/Hiring/useHiring";
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Filter,
  X,
  Gauge,
  Check,
} from "lucide-react";

export default function HiringManagerOpeningDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const {
    currentOpening,
    profiles,
    isLoading,
    actionLoading,
    error,
    previewUrl,
    getProfiles,
    shortlist,
    reject,
    fetchPreview,
    clearPreview,
    resetCurrent,
  } = useHiring();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [recommendationFilter, setRecommendationFilter] = useState("ALL");
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (id) {
      getProfiles(id);
    }
    return () => {
      resetCurrent();
    };
  }, [id, getProfiles, resetCurrent]);

  // Filtering profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (recommendationFilter !== "ALL" && p.badge !== recommendationFilter) return false;
      return true;
    });
  }, [profiles, statusFilter, recommendationFilter]);

  // Virtualization calculations (>50 records)
  const ITEM_HEIGHT = 200; // estimated card height
  const VISIBLE_COUNT = 15;
  const isVirtualized = filteredProfiles.length > 50;

  const startIndex = isVirtualized
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2)
    : 0;
  const endIndex = isVirtualized
    ? Math.min(filteredProfiles.length, startIndex + VISIBLE_COUNT + 4)
    : filteredProfiles.length;

  const visibleProfiles = useMemo(() => {
    return filteredProfiles.slice(startIndex, endIndex);
  }, [filteredProfiles, startIndex, endIndex]);

  const handleScroll = (e) => {
    if (isVirtualized) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const getBadgeStyle = (badge) => {
    switch (badge) {
      case "Recommended":
        return {
          container: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          dot: "bg-emerald-500",
        };
      case "Borderline":
        return {
          container: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          dot: "bg-amber-500",
        };
      case "Not Recommended":
        return {
          container: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
          dot: "bg-rose-500",
        };
      default:
        return {
          container: "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
          dot: "bg-neutral-400",
        };
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-10 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => router.push("/hiring-manager/openings")}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Openings
        </button>

        {/* Opening Header */}
        {isLoading && !currentOpening ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : currentOpening ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Opening Review
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                  {currentOpening.title}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {currentOpening.contractType || "Contract"}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                  Total Candidates: {profiles.length}
                </span>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-sm">
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Location</span>
                <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  {currentOpening.location || "Remote"}
                </div>
              </div>

              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">Experience Range</span>
                <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium mt-0.5">
                  <Briefcase className="w-4 h-4 text-neutral-400" />
                  {currentOpening.experienceRange?.min} - {currentOpening.experienceRange?.max || "Any"} years
                </div>
              </div>

              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">AI Recommendation</span>
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Deterministic + LLM Tool-Calling
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm text-sm">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 font-medium">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span>Filter Candidates:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Recommendation filter */}
            <select
              value={recommendationFilter}
              onChange={(e) => setRecommendationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All AI Recommendations</option>
              <option value="Recommended">🟢 Recommended (≥ 75%)</option>
              <option value="Borderline">🟡 Borderline (50% - 74%)</option>
              <option value="Not Recommended">🔴 Not Recommended (&lt; 50%)</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {/* Profiles List / Virtualized Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className={`space-y-4 ${
            isVirtualized ? "max-h-[800px] overflow-y-auto relative pr-2" : ""
          }`}
          style={
            isVirtualized
              ? { height: "750px" }
              : undefined
          }
        >
          {isLoading && profiles.length === 0 ? (
            // Skeleton Loaders
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl animate-pulse space-y-4"
                >
                  <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800/60 rounded w-2/3" />
                  <div className="h-10 bg-neutral-100 dark:bg-neutral-800/40 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                No candidate profiles match the current filter
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Try resetting filters or checking back when vendors upload profiles.
              </p>
            </div>
          ) : (
            <div
              style={
                isVirtualized
                  ? {
                      height: `${filteredProfiles.length * ITEM_HEIGHT}px`,
                      position: "relative",
                    }
                  : undefined
              }
            >
              <div
                style={
                  isVirtualized
                    ? {
                        position: "absolute",
                        top: `${startIndex * ITEM_HEIGHT}px`,
                        left: 0,
                        right: 0,
                      }
                    : undefined
                }
                className="space-y-4"
              >
                {visibleProfiles.map((profile) => {
                  const badgeStyle = getBadgeStyle(profile.badge);
                  const isActionLoading = actionLoading[profile.id];

                  return (
                    <div
                      key={profile.id}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-5"
                    >
                      {/* Top Bar: Name, Status, Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                              {profile.filename}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(profile.submittedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Vendor: {profile.uploadedBy?.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>

                        {/* Recommendation Badge & Status Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle.container}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${badgeStyle.dot}`} />
                            {profile.badge}
                          </span>

                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              profile.status === "SHORTLISTED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : profile.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                            }`}
                          >
                            {profile.status}
                          </span>
                        </div>
                      </div>

                      {/* AI Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/60 text-sm">
                        <div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                            Match Score
                          </span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {profile.score !== null ? `${profile.score}%` : "Evaluating..."}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                            Confidence
                          </span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {profile.confidence !== null ? `${profile.confidence}%` : "—"}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                            Processing Time
                          </span>
                          <div className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                            <Gauge className="w-4 h-4 text-neutral-400" />
                            <span>{profile.latencyMs ? `${profile.latencyMs} ms` : "—"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                            Agent Version
                          </span>
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            v{profile.version || "1.0.0"}
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      {profile.explanation && (
                        <div className="text-sm bg-neutral-50/60 dark:bg-neutral-800/20 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                            AI Reasoning & Explanation
                          </span>
                          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {profile.explanation}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons: Preview, Shortlist, Reject */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={() => fetchPreview(profile.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Preview Resume
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Reject Button */}
                          <button
                            disabled={isActionLoading || profile.status === "REJECTED"}
                            onClick={() => reject(profile.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {profile.status === "REJECTED" ? "Rejected" : "Reject"}
                          </button>

                          {/* Shortlist Button */}
                          <button
                            disabled={isActionLoading || profile.status === "SHORTLISTED"}
                            onClick={() => shortlist(profile.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {profile.status === "SHORTLISTED" ? "Shortlisted" : "Shortlist"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resume Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-4xl w-full h-[85vh] flex flex-col space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Candidate Resume Preview
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
                  title="Candidate Resume Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
