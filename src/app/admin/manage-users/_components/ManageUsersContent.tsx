/**
 * Manage Users Content Component
 * 
 * Interface for managing user accounts, roles, and permissions
 * for admin users only
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { UsersIcon } from "@heroicons/react/24/outline";
import { api } from "~/trpc/react";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt?: Date | null;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

interface EditUserForm {
  name: string;
  email: string;
  role: "admin" | "user";
}

export function ManageUsersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialKey = searchParams.get("specialKey");
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "user">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    email: "",
    role: "user",
  });

  // Access control check
  const hasAccess = React.useMemo(() => {
    // Development bypass
    if (process.env.NODE_ENV === "development" && specialKey === "DavideIsTesting") {
      return true;
    }
    // Production admin access
    return session?.user?.role === "admin";
  }, [session, specialKey]);

  // API queries and mutations
  const isDevelopmentAccess = process.env.NODE_ENV === "development" && specialKey === "DavideIsTesting";
  
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    refetch: refetchUsers 
  } = isDevelopmentAccess 
    ? api.userManagement.getPublicUserList.useQuery({ 
        specialKey: "DavideIsTesting",
        limit: 100 
      })
    : api.userManagement.getAllUsers.useQuery({ 
        limit: 100, 
        search: searchTerm || undefined,
        role: selectedRole === "all" ? undefined : selectedRole 
      }, { enabled: hasAccess });

  const { data: userStats } = isDevelopmentAccess
    ? { data: null }
    : api.userManagement.getUserStats.useQuery(undefined, { enabled: hasAccess });

  const createUserMutation = isDevelopmentAccess
    ? api.userManagement.createPublicUser.useMutation({
        onSuccess: () => {
          setShowCreateForm(false);
          setCreateForm({ name: "", email: "", password: "", role: "user" });
          void refetchUsers();
        },
      })
    : api.userManagement.createUser.useMutation({
        onSuccess: () => {
          setShowCreateForm(false);
          setCreateForm({ name: "", email: "", password: "", role: "user" });
          void refetchUsers();
        },
      });

  const updateUserMutation = api.userManagement.updateUserProfile.useMutation({
    onSuccess: () => {
      setEditingUser(null);
      void refetchUsers();
    },
  });

  const updateRoleMutation = api.userManagement.updateUserRole.useMutation({
    onSuccess: () => {
      void refetchUsers();
    },
  });

  const deleteUserMutation = api.userManagement.deleteUser.useMutation({
    onSuccess: () => {
      void refetchUsers();
    },
  });

  // Access control redirect
  useEffect(() => {
    if (status === "loading") return;
    
    if (!hasAccess) {
      router.push("/login");
    }
  }, [hasAccess, status, router]);

  // Initialize edit form when editing user
  useEffect(() => {
    if (editingUser) {
      setEditForm({
        name: editingUser.name || "",
        email: editingUser.email,
        role: editingUser.role,
      });
    }
  }, [editingUser]);

  // Handle form submissions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      return;
    }

    try {
      if (isDevelopmentAccess) {
        await createUserMutation.mutateAsync({
          specialKey: "DavideIsTesting",
          ...createForm,
        });
      } else {
        await (createUserMutation as any).mutateAsync(createForm);
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm.name.trim() || !editForm.email.trim()) {
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        name: editForm.name,
        email: editForm.email,
      });
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ userId });
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (status === "loading" || (hasAccess && usersLoading)) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-8 w-8 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Access Denied</h1>
          <p className="text-text-secondary mb-4">You don't have permission to access this page.</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  return (
    <div className="dashboard-panel-stack">
      {/* Development Access Notice */}
      {isDevelopmentAccess && (
        <section className="dashboard-section" aria-labelledby="dev-notice">
          <div className="dashboard-panel">
            <div className="flex items-center gap-2 p-4 bg-warning-50 border border-warning-200 rounded-lg">
              <span className="px-2 py-1 text-xs bg-warning-100 text-warning-700 rounded">
                Development Access
              </span>
              <span className="text-sm text-warning-700">
                Accessing with development bypass key
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Statistics */}
      {userStats && (
        <section className="dashboard-section" aria-labelledby="user-stats">
          <div className="dashboard-section__header">
            <div>
              <h2 id="user-stats" className="dashboard-section__title">User Statistics</h2>
              <p className="dashboard-section__description">
                Overview of user accounts and roles in the system
              </p>
            </div>
          </div>

          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{userStats.totalUsers}</span>
              <span className="dashboard-metric-card__label">Total Users</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{userStats.adminUsers}</span>
              <span className="dashboard-metric-card__label">Administrators</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{userStats.regularUsers}</span>
              <span className="dashboard-metric-card__label">Regular Users</span>
            </div>
          </div>
        </section>
      )}

      {/* User Management */}
      <section className="dashboard-section" aria-labelledby="user-management">
        <div className="dashboard-section__header">
          <div>
            <h2 id="user-management" className="dashboard-section__title">User Management</h2>
            <p className="dashboard-section__description">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            + Create User
          </button>
        </div>

        <div className="dashboard-panel">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="auth-input"
              />
            </div>
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "all" | "admin" | "user")}
                className="auth-input"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="user">Users</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || "No name"}</td>
                    <td>{user.email}</td>
                    <td>
                      {!isDevelopmentAccess && session?.user?.id !== user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                          className="text-sm rounded px-2 py-1 bg-background-secondary text-text-primary"
                          disabled={updateRoleMutation.isPending}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`dashboard-badge ${
                          user.role === "admin" ? "dashboard-badge-admin" : "dashboard-badge-user"
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingUser(user as User)}
                          className="btn btn-outline btn-xs"
                        >
                          Edit
                        </button>
                        {!isDevelopmentAccess && session?.user?.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-danger btn-xs"
                            disabled={deleteUserMutation.isPending}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="dashboard-empty-state">
                <UsersIcon className="w-16 h-16 text-text-tertiary mx-auto" />
                <div className="dashboard-empty-state-title">No Users Found</div>
                <div className="dashboard-empty-state-description">
                  {searchTerm ? "No users match your search criteria" : "No users in the system"}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background-primary/80 flex items-center justify-center z-50">
          <div className="bg-background-secondary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="auth-input-group">
                <label className="auth-label">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as "admin" | "user" }))}
                  className="auth-input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="auth-submit-btn flex-1"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-background-primary/80 flex items-center justify-center z-50">
          <div className="bg-background-secondary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="auth-input-group">
                <label className="auth-label">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="auth-submit-btn flex-1"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
