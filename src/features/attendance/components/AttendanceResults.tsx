import { useMemo, useState } from "react";

import {
  UserCheck,
  UserX,
  Clock,
  FileCheck,
  CircleDashed,
  Percent,
  ListChecks,
} from "lucide-react";

import { StatCard } from "@/shared/components/ui/Card";
import { Panel } from "@/shared/components/ui/Panel";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { Table } from "@/shared/components/ui/Table";

import { StatusLegend } from "@/features/attendance/components/StatusLegend";

import {
  statusLabel,
  statusVariant,
  statusIcon,
} from "@/features/attendance/lib/status";

import { Badge } from "@/shared/components/ui/Badge";

import type {
  AttendanceDateRow,
  AttendanceStatus,
} from "@/features/attendance/types";

import type { Column } from "@/shared/components/ui/Table";

const StatusCell = (row: AttendanceDateRow) => {
            const Icon = statusIcon(String(row.attendance_record));

            return (
                <Badge variant={statusVariant(String(row.attendance_record))}>
                <Icon className="mr-1 inline h-3.5 w-3.5" />
                {statusLabel(String(row.attendance_record))}
                </Badge>
            );
            };

const STATUS_FILTER_OPTIONS = [
        { value: "", label: "All statuses" },
        { value: "P", label: "Present" },
        { value: "A", label: "Absent" },
        { value: "L", label: "Late" },
        { value: "E", label: "Excused" },
        { value: "H", label: "Half Day" },
        ];

const SORT_OPTIONS = [
        { value: "roll", label: "Roll number" },
        { value: "name", label: "Name" },
        { value: "status", label: "Status" },
        ];     
        
const DATE_COLUMNS: Column<AttendanceDateRow>[] = [
            { key: "roll_number", header: "Roll No", render: (r) => String(r.roll_number ?? "—") },
            { key: "name", header: "Name", render: (r) => String(r.name ?? "—") },
            { key: "class", header: "Class", render: (r) => String(r.class ?? "—") },
            { key: "section", header: "Section", render: (r) => String(r.section ?? "—") },
            { key: "subject", header: "Subject", render: (r) => String(r.subject || "—") },
            { key: "attendance_record", header: "Status", render: StatusCell },
            { key: "time", header: "Time", render: (r) => String(r.time || "—") },
            ];

interface AttendanceResultsProps {
  rows: AttendanceDateRow[];
  date: string;
  totalRecords: number;
}

    

export function AttendanceResults({rows, date, totalRecords}: AttendanceResultsProps) {
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("roll");

    const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = {
        P: 0,
        A: 0,
        L: 0,
        E: 0,
        H: 0,
    };

    for (const r of rows) {
        const s = String(r.attendance_record) as AttendanceStatus;

        if (s in c) {
        c[s] += 1;
        }
    }

    return c;
    }, [rows]);

    const pct =
    rows.length > 0
        ? Math.round((counts.P / rows.length) * 100)
        : 0;

        const visible = useMemo(() => {
            let out = rows;

            if (statusFilter) {
                out = out.filter(
                (r) => r.attendance_record === statusFilter
                );
            }

            const q = search.trim().toLowerCase();

            if (q) {
                out = out.filter(
                (r) =>
                    String(r.roll_number).toLowerCase().includes(q) ||
                    String(r.name ?? "").toLowerCase().includes(q)
                );
            }

            const sorted = [...out];

            sorted.sort((a, b) => {
                if (sortBy === "name") {
                return String(a.name ?? "").localeCompare(
                    String(b.name ?? "")
                );
                }

                if (sortBy === "status") {
                return String(a.attendance_record).localeCompare(
                    String(b.attendance_record)
                );
                }

                return String(a.roll_number).localeCompare(
                String(b.roll_number),
                undefined,
                { numeric: true }
                );
            });

            return sorted;
            }, [rows, statusFilter, search, sortBy]);
            
            return(
                <>
                
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <StatCard label="Present" value={counts.P} icon={<UserCheck className="h-5 w-5" />} color="success" />
                        <StatCard label="Absent" value={counts.A} icon={<UserX className="h-5 w-5" />} color="danger" />
                        <StatCard label="Late" value={counts.L} icon={<Clock className="h-5 w-5" />} color="warning" />
                        <StatCard label="Excused" value={counts.E} icon={<FileCheck className="h-5 w-5" />} color="info" />
                        <StatCard label="Half Day" value={counts.H} icon={<CircleDashed className="h-5 w-5" />} />
                        <StatCard label="Present %" value={`${pct}%`} icon={<Percent className="h-5 w-5" />} color="primary" />
                    </div>
                
                    <Panel
                        icon={<ListChecks className="h-4 w-4" />}
                        title={`Records · ${date}`}
                        description={`${totalRecords} record(s) · showing ${visible.length}`}
                        actions={
                          <div className="flex flex-wrap items-center gap-2">
                            <SearchInput
                              value={search}
                              onChange={setSearch}
                              placeholder="Search roll or name…"
                              className="w-full sm:w-48"
                            />
                            <div className="w-36">
                              <Select
                                options={STATUS_FILTER_OPTIONS}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                              />
                            </div>
                            <div className="w-36">
                              <Select
                                options={SORT_OPTIONS}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                              />
                            </div>
                            </div>
                            }
                          >
                        <StatusLegend className="mb-4" />
                        {visible.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            No students match the current filters.
                          </p>
                        ) : (
                          <Table columns={DATE_COLUMNS} data={visible} stickyHeader />
                        )}
                      </Panel>

                      
                </>
            );
}