"use client";

import { useState } from "react";
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
import { CheckCircle, XCircle, Loader2, Briefcase } from "lucide-react";

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

export default function Home() {
  const [jobGroupId, setJobGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ job_group_id: jobGroupId.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sync jobs");
      }

      const data: SyncResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
            Job List Sync
          </h1>
          <p className="mt-2 text-slate-400">
            Sync jobs from JobsGlobal API to your Supabase database
          </p>
        </div>

        {/* Sync Form */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Sync Jobs</CardTitle>
            <CardDescription className="text-slate-400">
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
                className="flex-1 border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                disabled={loading}
              />
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
          <Alert className="border-red-800 bg-red-950/50 text-red-200">
            <XCircle className="h-4 w-4 text-red-400" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {result && result.success && (
          <Alert className="border-green-800 bg-green-950/50 text-green-200">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {result.message} - {result.rows_affected} row(s) affected
            </AlertDescription>
          </Alert>
        )}

        {/* Results Table */}
        {result && result.jobs.length > 0 && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Synced Jobs</CardTitle>
              <CardDescription className="text-slate-400">
                Jobs that were created or updated in your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-300">
                        Job Title
                      </TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Country</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">
                        Date Created
                      </TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.jobs.map((job, index) => (
                      <TableRow
                        key={job.job_post_id || index}
                        className="border-slate-800 hover:bg-slate-800/30"
                      >
                        <TableCell className="font-medium text-slate-100">
                          {job.job_title}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {job.category || "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {job.country || "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              job.status === "opened"
                                ? "bg-green-500/20 text-green-300"
                                : job.status === "closed"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {job.status || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {job.date_created || "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">
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
