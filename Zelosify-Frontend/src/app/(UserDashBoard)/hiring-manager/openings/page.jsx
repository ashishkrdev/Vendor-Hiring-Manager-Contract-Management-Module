"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useHiring } from "@/hooks/Hiring/useHiring";
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
} from "lucide-react";

export default function HiringManagerOpeningsPage() {
  const { openings, pagination, isLoading, error, getOpenings } = useHiring();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getOpenings({ page: currentPage, limit: 10, search: searchTerm });
  }, [getOpenings, currentPage, searchTerm]);

  const filteredOpenings = openings.filter((op) =>
    searchTerm
      ? op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.location?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-10 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              My Contract Openings
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Review assigned contract vacancies and candidate profiles with AI-assisted decision support.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search your openings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-neutral-100 shadow-sm"
            />
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Openings Table Container */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {isLoading && openings.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading assigned openings...
              </p>
            </div>
          ) : filteredOpenings.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                No openings found
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                You do not have any openings assigned under your hiring manager account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 font-medium">
                    <th className="py-3.5 px-4 font-semibold">Title</th>
                    <th className="py-3.5 px-4 font-semibold">Location</th>
                    <th className="py-3.5 px-4 font-semibold">Contract Type</th>
                    <th className="py-3.5 px-4 font-semibold">Posted Date</th>
                    <th className="py-3.5 px-4 font-semibold">Candidates</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {filteredOpenings.map((opening) => (
                    <tr
                      key={opening.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        <div>
                          <span>{opening.title}</span>
                          <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            Exp: {opening.experienceMin}
                            {opening.experienceMax ? ` - ${opening.experienceMax}` : "+"} years
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                          <MapPin className="w-4 h-4 text-neutral-400" />
                          <span>{opening.location || "Remote"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {opening.contractType || "Contract"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-neutral-400" />
                          <span>
                            {opening.postedDate
                              ? new Date(opening.postedDate).toLocaleDateString()
                              : "Recent"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                          <Users className="w-4 h-4 text-neutral-400" />
                          <span>{opening.profilesCount ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/hiring-manager/openings/${opening.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          Review Candidates
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
