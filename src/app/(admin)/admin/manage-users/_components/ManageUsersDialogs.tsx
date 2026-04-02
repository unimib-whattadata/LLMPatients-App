"use client";

import type { UseFormReturn } from "react-hook-form";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
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

import type {
  CreateUserValues,
  EditUserValues,
  ManagedUser,
} from "./manage-users-types";

interface CreateUserDialogProps {
  open: boolean;
  form: UseFormReturn<CreateUserValues>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function CreateUserDialog({
  open,
  form,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CreateUserDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          form.reset();
        }
      }}
    >
      <DialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Fill in the fields to create a new account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="auth-input-group">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EditUserDialogProps {
  user: ManagedUser | null;
  form: UseFormReturn<EditUserValues>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function EditUserDialog({
  user,
  form,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: EditUserDialogProps) {
  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(false);
          form.reset();
        }
      }}
    >
      <DialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the selected user&apos;s information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  user: ManagedUser | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteUserDialog({
  user,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog
      open={Boolean(user)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(false);
        }
      }}
    >
      <AlertDialogContent className="bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. The selected user will be permanently
            removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
