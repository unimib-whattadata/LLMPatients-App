/**
 * Admin User Management Page
 * 
 * Special admin-only page for managing users with the following features:
 * - View all users in a searchable table
 * - Create new users with role assignment
 * - Update user profiles and roles
 * - Delete users (except self)
 * - Access control with development bypass
 * 
 * Access Control:
 * - Production: Only admin role users can access
 * - Development: Special access with ?specialKey=DavideIsTesting query parameter
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function AdminUserManagementPage() {
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-background-secondary border-b border-border-primary">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-background-tertiary rounded"></div>
                <span className="ml-2 text-lg font-medium text-text-primary">ePatient</span>
              </Link>
              <span className="ml-4 text-sm text-text-tertiary">/ Admin / User Management</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isDevelopmentAccess && (
                <span className="px-2 py-1 text-xs bg-warning-50 text-warning-700 rounded">
                  Development Access
                </span>
              )}
              {session?.user && (
                <>
                  <span className="text-sm text-text-secondary">{session.user.email}</span>
                  <Link href="/dashboard" className="btn btn-outline btn-sm">
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
            <p className="mt-2 text-text-secondary">
              Manage user accounts, roles, and permissions
            </p>
          </div>

          {/* Statistics */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{userStats.totalUsers}</div>
                <div className="dashboard-stat-label">Total Users</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{userStats.adminUsers}</div>
                <div className="dashboard-stat-label">Administrators</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{userStats.regularUsers}</div>
                <div className="dashboard-stat-label">Regular Users</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="dashboard-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 sm:mb-0">
                All Users
              </h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary"
              >
                + Create User
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as "all" | "admin" | "user")}
                  className="input-field"
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
                    {/* <th>Created</th> */}
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
                            className="text-sm border border-border-primary rounded px-2 py-1 bg-background-secondary text-text-primary"
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
                      {/* <td>{formatDate(user.createdAt)}</td> */}
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
                  <div className="dashboard-empty-state-icon">👥</div>
                  <div className="dashboard-empty-state-title">No Users Found</div>
                  <div className="dashboard-empty-state-description">
                    {searchTerm ? "No users match your search criteria" : "No users in the system"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background-primary/80 flex items-center justify-center z-50">
          <div className="bg-background-secondary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as "admin" | "user" }))}
                  className="input-field"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="btn btn-primary flex-1"
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
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="btn btn-primary flex-1"
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
