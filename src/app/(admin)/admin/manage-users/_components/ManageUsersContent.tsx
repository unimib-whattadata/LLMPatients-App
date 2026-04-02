"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";

import { Button } from "~/components/ui/button";
import { useAppToast } from "~/hooks/useAppToast";
import { createLogger } from "~/lib/logger";
import { api } from "~/trpc/react";

import {
  CreateUserDialog,
  DeleteUserDialog,
  EditUserDialog,
} from "./ManageUsersDialogs";
import { ManageUsersLoading } from "./ManageUsersLoading";
import {
  ManageUsersFilters,
  ManageUsersStatsSection,
  ManageUsersTable,
} from "./ManageUsersSections";
import {
  createUserSchema,
  editUserSchema,
  type CreateUserInput,
  type CreateUserValues,
  type EditUserValues,
  type ManagedUser,
  type UserStats,
} from "./manage-users-types";

const logger = createLogger("ManageUsers");

export function ManageUsersContent() {
  const { data: session } = useSession();
  const { success, error: showError } = useAppToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "user">(
    "all",
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

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

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = api.userManagement.getAllUsers.useQuery({
    limit: 100,
    search: searchTerm || undefined,
    role: selectedRole === "all" ? undefined : selectedRole,
  });

  const { data: userStats } = api.userManagement.getUserStats.useQuery();

  const createUserMutation = api.userManagement.createUser.useMutation({
    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      createUserForm.reset();
      success("User created", "The account has been added successfully.");
      await refetchUsers();
    },
    onError: (error) => {
      logger.error("User creation failed", error);
      showError("Unable to create user", error.message);
    },
  });

  const updateUserMutation = api.userManagement.updateUserProfile.useMutation({
    onSuccess: async () => {
      setEditingUser(null);
      editUserForm.reset();
      success("User updated", "The account details have been saved.");
      await refetchUsers();
    },
    onError: (error) => {
      logger.error("User update failed", error);
      showError("Unable to update user", error.message);
    },
  });

  const updateRoleMutation = api.userManagement.updateUserRole.useMutation({
    onSuccess: async () => {
      success("Role updated", "The user role has been changed.");
      await refetchUsers();
    },
    onError: (error) => {
      logger.error("Role update failed", error);
      showError("Unable to update role", error.message);
    },
  });

  const deleteUserMutation = api.userManagement.deleteUser.useMutation({
    onSuccess: async () => {
      setUserToDelete(null);
      success("User deleted", "The account has been removed.");
      await refetchUsers();
    },
    onError: (error) => {
      logger.error("User deletion failed", error);
      showError("Unable to delete user", error.message);
    },
  });

  useEffect(() => {
    if (!editingUser) {
      return;
    }

    editUserForm.reset({
      name: editingUser.name ?? "",
      email: editingUser.email,
    });
  }, [editUserForm, editingUser]);

  const handleCreateUser = createUserForm.handleSubmit(async (values) => {
    const payload: CreateUserInput = { ...values };
    await createUserMutation.mutateAsync(payload);
  });

  const handleUpdateUser = editUserForm.handleSubmit(async (values) => {
    if (!editingUser) return;

    await updateUserMutation.mutateAsync({
      userId: editingUser.id,
      name: values.name,
      email: values.email,
    });
  });

  const handleRoleChange = async (
    userId: string,
    role: "admin" | "user",
  ) => {
    await updateRoleMutation.mutateAsync({ userId, role });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUserMutation.mutateAsync({ userId: userToDelete.id });
  };

  if (usersLoading) {
    return <ManageUsersLoading />;
  }

  const users = (Array.isArray(usersData) ? usersData : usersData?.users || []) as ManagedUser[];

  return (
    <div className="dashboard-panel-stack">
      <ManageUsersStatsSection stats={userStats as UserStats | undefined} />

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
          <Button onClick={() => setIsCreateDialogOpen(true)}>+ Create User</Button>
        </div>

        <div className="dashboard-panel">
          <ManageUsersFilters
            searchTerm={searchTerm}
            selectedRole={selectedRole}
            onSearchTermChange={setSearchTerm}
            onRoleChange={setSelectedRole}
          />

          <ManageUsersTable
            users={users}
            currentUserId={session?.user?.id}
            searchTerm={searchTerm}
            isUpdatingRole={updateRoleMutation.isPending}
            isDeleting={deleteUserMutation.isPending}
            onCreateUser={() => setIsCreateDialogOpen(true)}
            onEditUser={setEditingUser}
            onDeleteUser={setUserToDelete}
            onRoleChange={(userId, role) => {
              void handleRoleChange(userId, role);
            }}
          />
        </div>
      </section>

      <CreateUserDialog
        open={isCreateDialogOpen}
        form={createUserForm}
        isSubmitting={createUserMutation.isPending}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={() => void handleCreateUser()}
      />

      <EditUserDialog
        user={editingUser}
        form={editUserForm}
        isSubmitting={updateUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
        }}
        onSubmit={() => void handleUpdateUser()}
      />

      <DeleteUserDialog
        user={userToDelete}
        isDeleting={deleteUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
        onConfirm={() => void confirmDeleteUser()}
      />
    </div>
  );
}
