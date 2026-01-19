"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "~/components/ui/button";
import type { AdminPatientSummary } from "./types";

export const patientColumns: ColumnDef<AdminPatientSummary>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const patient = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{patient.name}</span>
          <span className="text-xs text-gray-400">{patient.smallDescription}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    cell: ({ row }) => {
      const { difficulty } = row.original;
      return <span>{"●".repeat(difficulty)}</span>;
    },
  },
  {
    accessorKey: "estimatedDuration",
    header: "Duration",
    cell: ({ row }) => (
      <span>{row.original.estimatedDuration} min</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <span className={row.original.isActive ? "text-success" : "text-text-muted"}>
        {row.original.isActive ? "Active" : "Draft"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return createdAt ? format(new Date(createdAt), "dd/MM/yyyy") : "—";
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const patient = row.original;
      return (
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/patient/show/${patient.id}`}>View</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/dashboard/patient/edit/${patient.id}`}>Edit</Link>
          </Button>
        </div>
      );
    },
  },
];
