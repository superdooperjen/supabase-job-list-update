"use client";

import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  XCircle,
  Loader2,
  Briefcase,
  TrendingUp,
  Users,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Key,
  Database,
  Search,
  Eye,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

interface Job {
  id?: number;
  job_group_id: string;
  job_post_id: string;
  job_title: string;
  email: string;
  apply_link: string;
  image_link: string;
  category: string | null;
  country: string | null;
  status: string | null;
  date_created: string | null;
}

interface SyncResponse {
  success: boolean;
  message: string;
  rows_affected: number;
  jobs: Job[];
  embeddings_updated?: number;
}

interface JobGroup {
  job_group_id: string;
  status: string | null;
  date_created: string | null;
  job_count: number;
}

interface Stats {
  total_open_trips: number;
  total_open_jobs: number;
  total_trips: number;
  total_jobs: number;
}

export default function Home() {
  const [jobGroupId, setJobGroupId] = useState("");
  const [status, setStatus] = useState<"Open" | "Close">("Open");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);

  // Job groups state
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [jobGroupsLoading, setJobGroupsLoading] = useState(true);
  const [jobGroupsError, setJobGroupsError] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_created" | "status">(
    "date_created"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Reindex state
  const [secretCode, setSecretCode] = useState("");
  const [reindexJobGroupId, setReindexJobGroupId] = useState("");
  const [reindexLoading, setReindexLoading] = useState(false);

  // Country dropdown state
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Modal state for job count
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJobs, setModalJobs] = useState<Job[]>([]);
  const [modalGroupId, setModalGroupId] = useState<string>("");
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch job groups
  const fetchJobGroups = async () => {
    setJobGroupsLoading(true);
    setJobGroupsError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await fetch(
        `http://localhost:8000/api/job-groups?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch job groups");
      }

      const data = await response.json();
      setJobGroups(data.job_groups);
    } catch (err) {
      setJobGroupsError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setJobGroupsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/stats");

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch countries for dropdown
  const fetchCountries = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/countries");
      if (!response.ok) {
        throw new Error("Failed to fetch countries");
      }
      const data = await response.json();
      setCountries(data.countries);
    } catch (err) {
      console.error("Error fetching countries:", err);
    }
  };

  // Open modal with jobs for a specific job_group_id
  const openJobsModal = async (groupId: string) => {
    setModalOpen(true);
    setModalGroupId(groupId);
    setModalLoading(true);
    setModalJobs([]);

    try {
      const response = await fetch(
        `http://localhost:8000/api/jobs/${encodeURIComponent(groupId)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const data = await response.json();
      setModalJobs(data.jobs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setModalLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchJobGroups();
    fetchStats();
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchJobGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sortBy, sortOrder]);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobGroupId.trim()) {
      toast.error("Please enter a job group ID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/sync-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          job_group_id: jobGroupId.trim(), 
          status,
          country: selectedCountry || null 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sync jobs");
      }

      const data: SyncResponse = await response.json();
      setResult(data);
      
      // Show different toast message based on status and embeddings
      if (status === "Open" && data.embeddings_updated && data.embeddings_updated > 0) {
        toast.success(
          `${data.message} - ${data.rows_affected} row(s) affected, ${data.embeddings_updated} embedding(s) rebuilt`
        );
      } else {
        toast.success(`${data.message} - ${data.rows_affected} row(s) affected`);
      }

      // Refresh job groups and stats after successful sync
      fetchJobGroups();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchJobGroups();
    fetchStats();
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleReindexAll = async () => {
    if (!secretCode.trim()) {
      toast.error("Please enter the secret code");
      return;
    }

    setReindexLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/reindex-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          secret_code: secretCode.trim(),
          job_group_id: reindexJobGroupId.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to reindex embeddings");
      }

      const data = await response.json();
      toast.success(
        `${data.message}`
      );
      setSecretCode("");
      setReindexJobGroupId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setReindexLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 transition-colors duration-300">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 p-3">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
                Job List Sync
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Sync jobs from JobsGlobal API to your Supabase database
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Trips
              </CardTitle>
              <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.total_trips || 0
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Unique job groups
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Open Trips
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.total_open_trips || 0
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Active job groups
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Jobs
              </CardTitle>
              <Briefcase className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.total_jobs || 0
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Total job posts
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Open Jobs
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.total_open_jobs || 0
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Active job posts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Form */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Sync Jobs
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Enter a Job Group ID to fetch and sync jobs to your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSync} className="flex gap-4">
              <Input
                type="text"
                placeholder="Enter Job Group ID (e.g., g6926375a9187f16)"
                value={jobGroupId}
                onChange={(e) => setJobGroupId(e.target.value)}
                className="flex-1 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                disabled={loading}
              />
              <Select
                value={status}
                onValueChange={(value: "Open" | "Close") => setStatus(value)}
                disabled={loading}
              >
                <SelectTrigger className="w-32 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <SelectItem
                    value="Open"
                    className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                  >
                    Open
                  </SelectItem>
                  <SelectItem
                    value="Close"
                    className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                  >
                    Close
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Select
                  key={selectedCountry || "empty"}
                  value={selectedCountry || undefined}
                  onValueChange={(value: string) => setSelectedCountry(value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-44 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                    <Globe className="h-4 w-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 max-h-60">
                    {countries.map((country) => (
                      <SelectItem
                        key={country}
                        value={country}
                        className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                      >
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCountry && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCountry("")}
                    className="px-2 text-slate-500 hover:text-slate-700"
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync Jobs"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>


        {/* Synced Jobs Results Table - shown after sync */}
        {result && result.jobs.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Synced Jobs
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Jobs that were created or updated in your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Job Title
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Category
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Country
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Date Created
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Email
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.jobs.map((job, index) => (
                      <TableRow
                        key={job.job_post_id || index}
                        className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {job.job_title}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {job.category || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {job.country || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={job.status === "Open" ? "success" : "danger"}
                          >
                            {job.status || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {job.date_created || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {job.email}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Groups Listing */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Job Groups
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Unique job groups from your Supabase database
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={jobGroupsLoading}
                className="border-slate-300 dark:border-slate-700"
              >
                <RefreshCw
                  className={`h-4 w-4 ${jobGroupsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search Job Group ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchJobGroups()}
                  className="w-48 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <SelectItem
                      value="all"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      All Status
                    </SelectItem>
                    <SelectItem
                      value="Open"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      Open
                    </SelectItem>
                    <SelectItem
                      value="Close"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      Close
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                <Select
                  value={sortBy}
                  onValueChange={(value: "date_created" | "status") =>
                    setSortBy(value)
                  }
                >
                  <SelectTrigger className="w-40 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <SelectItem
                      value="date_created"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      Date Created
                    </SelectItem>
                    <SelectItem
                      value="status"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      Status
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="border-slate-300 dark:border-slate-700"
                >
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobGroupsError && (
              <Alert className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{jobGroupsError}</AlertDescription>
              </Alert>
            )}

            {jobGroupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : jobGroups.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No job groups found
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Job Group ID
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Date Created
                      </TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">
                        Jobs Count
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobGroups.map((group, index) => (
                      <TableRow
                        key={group.job_group_id || index}
                        className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-mono text-sm text-slate-900 dark:text-slate-100">
                          {group.job_group_id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              group.status === "Open" ? "success" : "danger"
                            }
                          >
                            {group.status || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {group.date_created || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          <button
                            onClick={() => openJobsModal(group.job_group_id)}
                            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors"
                          >
                            <span>{group.job_count}</span>
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Admin Tools - Reindex All */}
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-amber-900 dark:text-amber-100">
                Admin Tools
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Reindex embeddings in the database. Leave Job Group ID empty to reindex all, or enter a specific ID to reindex only that group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-500" />
                  <Input
                    type="password"
                    placeholder="Enter secret code"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="pl-10 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-amber-500/70"
                    disabled={reindexLoading}
                  />
                </div>
                <Input
                  type="text"
                  placeholder="Job Group ID (optional - leave empty for all)"
                  value={reindexJobGroupId}
                  onChange={(e) => setReindexJobGroupId(e.target.value)}
                  className="flex-1 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-amber-500/70"
                  disabled={reindexLoading}
                />
              </div>
              <Button
                onClick={handleReindexAll}
                disabled={reindexLoading}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                {reindexLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reindexing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    {reindexJobGroupId.trim() ? `Reindex Job Group: ${reindexJobGroupId.trim()}` : "Reindex All Embeddings"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Count Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="!w-[80vw] !max-w-7xl max-h-[85vh] flex flex-col border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Jobs for Group: {modalGroupId}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {modalJobs.length} job(s) in this group
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable content area - scrollbars are on this container */}
          <div className="flex-1 overflow-auto min-h-0 rounded-lg border border-slate-200 dark:border-slate-800">
            {modalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : modalJobs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No jobs found for this group
              </div>
            ) : (
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b transition-colors">
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Job Title
                    </th>
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Category
                    </th>
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Country
                    </th>
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Status
                    </th>
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Date Created
                    </th>
                    <th className="text-slate-700 dark:text-slate-300 whitespace-nowrap h-10 px-2 text-left align-middle font-medium">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {modalJobs.map((job, index) => (
                    <tr
                      key={job.job_post_id || index}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b transition-colors"
                    >
                      <td className="font-medium text-slate-900 dark:text-slate-100 p-2 align-middle whitespace-nowrap">
                        {job.job_title}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 p-2 align-middle whitespace-nowrap">
                        {job.category || "-"}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 p-2 align-middle whitespace-nowrap">
                        {job.country || "-"}
                      </td>
                      <td className="p-2 align-middle">
                        <Badge
                          variant={job.status === "Open" ? "success" : "danger"}
                        >
                          {job.status || "-"}
                        </Badge>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap p-2 align-middle">
                        {job.date_created || "-"}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 p-2 align-middle whitespace-nowrap">
                        {job.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
