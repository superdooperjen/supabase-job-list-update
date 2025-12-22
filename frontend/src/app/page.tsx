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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Briefcase,
  TrendingUp,
  Users,
  RefreshCw,
  ArrowUpDown,
  Filter,
} from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

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

  // Initial fetch
  useEffect(() => {
    fetchJobGroups();
    fetchStats();
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
      setError("Please enter a job group ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/sync-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_group_id: jobGroupId.trim(), status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sync jobs");
      }

      const data: SyncResponse = await response.json();
      setResult(data);

      // Refresh job groups and stats after successful sync
      fetchJobGroups();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 transition-colors duration-300">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
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
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
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

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {result && result.success && (
          <Alert className="border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {result.message} - {result.rows_affected} row(s) affected
            </AlertDescription>
          </Alert>
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
            <div className="flex items-center gap-4 mt-4">
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
                          {group.job_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
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
      </div>
    </div>
  );
}
