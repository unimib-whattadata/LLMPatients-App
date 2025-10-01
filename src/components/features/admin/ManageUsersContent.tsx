/**
 * Manage Users Content Component
 *
 * Interface for managing user accounts, roles, and permissions
 * for admin users only
 */

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { inferRouterInputs } from "@trpc/server";

// Get environment variables for client-side usage
const isDevelopment =
  process.env.NEXT_PUBLIC_NODE_ENV === "development" ||
  process.env.NODE_ENV === "development";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import type { AppRouter } from "~/server/api/root";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt?: Date | null;
}

const createUserSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  email: z.string().email("Inserisci un'email valida"),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  role: z.enum(["admin", "user"]),
});

const editUserSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  email: z.string().email("Inserisci un'email valida"),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type EditUserValues = z.infer<typeof editUserSchema>;
type RouterInputs = inferRouterInputs<AppRouter>;
type CreatePublicUserInput = RouterInputs["userManagement"]["createPublicUser"];
type CreateUserInput = RouterInputs["userManagement"]["createUser"];

export function ManageUsersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialKey = searchParams.get("specialKey");

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "user">(
    "all",
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const createUserForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const editUserForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Access control check
  const hasAccess = React.useMemo(() => {
    // Development bypass
    if (isDevelopment && specialKey === "DavideIsTesting") {
      return true;
    }
    // Production admin access
    return session?.user?.role === "admin";
  }, [session, specialKey]);

  // API queries and mutations
  const isDevelopmentAccess = isDevelopment && specialKey === "DavideIsTesting";

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = isDevelopmentAccess
    ? api.userManagement.getPublicUserList.useQuery({
        specialKey: "DavideIsTesting",
        limit: 100,
      })
    : api.userManagement.getAllUsers.useQuery(
        {
          limit: 100,
          search: searchTerm || undefined,
          role: selectedRole === "all" ? undefined : selectedRole,
        },
        { enabled: hasAccess },
      );

  const { data: userStats } = isDevelopmentAccess
    ? { data: null }
    : api.userManagement.getUserStats.useQuery(undefined, {
        enabled: hasAccess,
      });

  const createPublicUserMutation =
    api.userManagement.createPublicUser.useMutation({
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        createUserForm.reset();
        void refetchUsers();
      },
    });

  const createPrivateUserMutation = api.userManagement.createUser.useMutation({
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      createUserForm.reset();
      void refetchUsers();
    },
  });

  const createUserIsPending = isDevelopmentAccess
    ? createPublicUserMutation.isPending
    : createPrivateUserMutation.isPending;

  const updateUserMutation = api.userManagement.updateUserProfile.useMutation({
    onSuccess: () => {
      setEditingUser(null);
      editUserForm.reset();
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
      editUserForm.reset({
        name: editingUser.name ?? "",
        email: editingUser.email,
      });
    }
  }, [editingUser, editUserForm]);

  // Handle form submissions
  const handleCreateUser = createUserForm.handleSubmit(async (values) => {
    try {
      if (isDevelopmentAccess) {
        const payload: CreatePublicUserInput = {
          ...values,
          specialKey: "DavideIsTesting",
        };
        await createPublicUserMutation.mutateAsync(payload);
      } else {
        const payload: CreateUserInput = { ...values };
        await createPrivateUserMutation.mutateAsync(payload);
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  });

  const handleUpdateUser = editUserForm.handleSubmit(async (values) => {
    if (!editingUser) return;

    try {
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        name: values.name,
        email: values.email,
      });
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  });

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "user",
  ) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync({ userId: userToDelete.id });
      setUserToDelete(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  // Loading state
  if (status === "loading" || (hasAccess && usersLoading)) {
    return (
      <div className="dashboard-panel-stack">
        {/* Header skeleton */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <Skeleton variant="text" className="h-8 w-64" />
              <Skeleton variant="text" className="mt-2 h-4 w-96" />
            </div>
          </div>
        </section>

        {/* Statistics skeleton */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <Skeleton variant="text" className="h-6 w-48" />
              <Skeleton variant="text" className="mt-2 h-4 w-72" />
            </div>
          </div>
          <div className="dashboard-metric-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="dashboard-metric-card">
                <Skeleton variant="text" className="mx-auto mb-2 h-8 w-12" />
                <Skeleton variant="text" className="mx-auto h-4 w-20" />
              </div>
            ))}
          </div>
        </section>

        {/* User Management skeleton */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <Skeleton variant="text" className="h-6 w-48" />
              <Skeleton variant="text" className="mt-2 h-4 w-72" />
            </div>
            <Skeleton variant="button" className="h-10 w-32" />
          </div>

          <div className="dashboard-panel">
            {/* Filters skeleton */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <Skeleton variant="text" className="h-10 flex-1" />
              <Skeleton variant="text" className="h-10 w-32" />
            </div>

            {/* Table skeleton */}
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>
                      <Skeleton variant="text" className="h-4 w-16" />
                    </th>
                    <th>
                      <Skeleton variant="text" className="h-4 w-16" />
                    </th>
                    <th>
                      <Skeleton variant="text" className="h-4 w-16" />
                    </th>
                    <th>
                      <Skeleton variant="text" className="h-4 w-16" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td>
                        <Skeleton variant="text" className="h-4 w-24" />
                      </td>
                      <td>
                        <Skeleton variant="text" className="h-4 w-32" />
                      </td>
                      <td>
                        <Skeleton
                          variant="text"
                          className="h-6 w-16 rounded-full"
                        />
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <Skeleton variant="button" className="h-8 w-16" />
                          <Skeleton variant="button" className="h-8 w-20" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="bg-background-primary flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-text-primary mb-4 text-2xl font-bold">
            Access Denied
          </h1>
          <p className="text-text-secondary mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const users = (Array.isArray(usersData)
    ? usersData
    : usersData?.users || []) as unknown as User[];

  return (
    <div className="dashboard-panel-stack">
      {/* Development Access Notice */}
      {isDevelopmentAccess && (
        <section className="dashboard-section" aria-labelledby="dev-notice">
          <div className="dashboard-panel">
            <div className="bg-warning-50 border-warning-200 flex items-center gap-2 rounded-lg border p-4">
              <span className="bg-warning-100 text-warning-700 rounded px-2 py-1 text-xs">
                Development Access
              </span>
              <span className="text-warning-700 text-sm">
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
              <span className="dashboard-metric-card__value">
                {userStats.totalUsers}
              </span>
              <span className="dashboard-metric-card__label">Total Users</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {userStats.adminUsers}
              </span>
              <span className="dashboard-metric-card__label">
                Administrators
              </span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {userStats.regularUsers}
              </span>
              <span className="dashboard-metric-card__label">
                Regular Users
              </span>
            </div>
          </div>
        </section>
      )}

      {/* User Management */}
      <section className="dashboard-section" aria-labelledby="user-management">
        <div className="dashboard-section__header">
          <div>
            <h2 id="user-management" className="dashboard-section__title">
              User Management
            </h2>
            <p className="dashboard-section__description">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            + Create User
          </Button>
        </div>

        <div className="dashboard-panel">
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as "all" | "admin" | "user")
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

          {/* Users Table */}
          {users.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" aria-hidden="true" />}
              title="No Users Found"
              description={
                searchTerm
                  ? "No users match your current search."
                  : "Non ci sono utenti registrati al momento."
              }
              action={
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create User
                </Button>
              }
              className="bg-[var(--color-surface-secondary)]"
            />
          ) : (
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
                    <TableCell className="font-medium">
                      {user.name || "No name"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {!isDevelopmentAccess && session?.user?.id !== user.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(user.id, value as "admin" | "user")
                          }
                          disabled={updateRoleMutation.isPending}
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
                          onClick={() => setEditingUser(user as User)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        {!isDevelopmentAccess &&
                          session?.user?.id !== user.id && (
                            <Button
                              onClick={() => handleDeleteUser(user as User)}
                              variant="destructive"
                              size="sm"
                              disabled={deleteUserMutation.isPending}
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
          )}
        </div>
      </section>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            createUserForm.reset();
          }
        }}
      >
        <DialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Compila i campi per creare un nuovo account.
            </DialogDescription>
          </DialogHeader>
          <Form {...createUserForm}>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <FormField
                control={createUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={createUserIsPending}
                >
                  {createUserIsPending ? "Creating..." : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    createUserForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
            editUserForm.reset();
          }
        }}
      >
        <DialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Aggiorna le informazioni dell&apos;utente selezionato.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <FormField
                control={editUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="auth-input-group">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingUser(null);
                    editUserForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina utente</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. L&apos;utente selezionato verrà
              rimosso in modo permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteUser()}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
