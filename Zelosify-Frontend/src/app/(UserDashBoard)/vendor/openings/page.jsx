"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useVendor } from "@/hooks/Vendor/useVendor";
import {
  Briefcase,
  MapPin,
  Clock,
  User,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function VendorOpeningsPage() {
  const { openings, pagination, isLoading, error, getOpenings } = useVendor();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getOpenings({ page: currentPage, limit: 10, search: searchTerm });
  }, [getOpenings, currentPage, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-10 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Contract Openings
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Browse active openings under your tenant and submit qualified candidate profiles.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search roles, locations..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 shadow-sm"
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

        {/* Table Container */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {isLoading && openings.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading contract openings...
              </p>
            </div>
          ) : openings.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                No openings found
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                There are currently no matching contract openings available for your tenant.
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
                    <th className="py-3.5 px-4 font-semibold">Hiring Manager Name</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {openings.map((opening) => (
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {opening.contractType || "Full-Time"}
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
                      <td className="py-4 px-4 text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-neutral-400" />
                          <span>{opening.hiringManagerName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/vendor/openings/${opening.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View & Submit
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
              <div>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
