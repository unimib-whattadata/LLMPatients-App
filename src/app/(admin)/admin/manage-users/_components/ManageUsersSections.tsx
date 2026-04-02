"use client";

import { Users } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";

import type { ManagedUser, UserStats } from "./manage-users-types";

interface ManageUsersStatsSectionProps {
  stats?: UserStats;
}

export function ManageUsersStatsSection({
  stats,
}: ManageUsersStatsSectionProps) {
  if (!stats) {
    return null;
  }

  return (
    <section className="dashboard-section" aria-labelledby="user-stats">
      <div className="dashboard-section__header">
        <div>
          <h2 id="user-stats" className="dashboard-section__title">
            User Statistics
          </h2>
          <p className="dashboard-section__description">
            Overview of user accounts and roles in the system
          </p>
        </div>
      </div>

      <div className="dashboard-metric-grid">
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-card__value">{stats.totalUsers}</span>
          <span className="dashboard-metric-card__label">Total Users</span>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-card__value">{stats.adminUsers}</span>
          <span className="dashboard-metric-card__label">Administrators</span>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-card__value">
            {stats.regularUsers}
          </span>
          <span className="dashboard-metric-card__label">Regular Users</span>
        </div>
      </div>
    </section>
  );
}

interface ManageUsersFiltersProps {
  searchTerm: string;
  selectedRole: "all" | "admin" | "user";
  onSearchTermChange: (value: string) => void;
  onRoleChange: (value: "all" | "admin" | "user") => void;
}

export function ManageUsersFilters({
  searchTerm,
  selectedRole,
  onSearchTermChange,
  onRoleChange,
}: ManageUsersFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </div>
      <div className="w-full sm:w-auto">
        <Select
          value={selectedRole}
          onValueChange={(value) =>
            onRoleChange(value as "all" | "admin" | "user")
          }
        >
          <SelectTrigger className="min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface ManageUsersTableProps {
  users: ManagedUser[];
  currentUserId?: string;
  searchTerm: string;
  isUpdatingRole: boolean;
  isDeleting: boolean;
  onCreateUser: () => void;
  onEditUser: (user: ManagedUser) => void;
  onDeleteUser: (user: ManagedUser) => void;
  onRoleChange: (userId: string, role: "admin" | "user") => void;
}

export function ManageUsersTable({
  users,
  currentUserId,
  searchTerm,
  isUpdatingRole,
  isDeleting,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onRoleChange,
}: ManageUsersTableProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" aria-hidden="true" />}
        title="No Users Found"
        description={
          searchTerm
            ? "No users match your current search."
            : "There are currently no registered users."
        }
        action={<Button onClick={onCreateUser}>Create User</Button>}
        className="bg-[var(--color-surface-secondary)]"
      />
    );
  }

  return (
    <Table className="dashboard-table">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name || "No name"}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {currentUserId !== user.id ? (
                <Select
                  value={user.role}
                  onValueChange={(value) =>
                    onRoleChange(user.id, value as "admin" | "user")
                  }
                  disabled={isUpdatingRole}
                >
                  <SelectTrigger className="min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant={user.role === "admin" ? "admin" : "user"}
                  className="uppercase"
                >
                  {user.role}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => onEditUser(user)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
                {currentUserId !== user.id && (
                  <Button
                    onClick={() => onDeleteUser(user)}
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
