"use client";

import type { UseFormReturn } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  DashboardMetricCard,
  DashboardPanel,
  DashboardSection,
} from "~/components/dashboard/ui";

import type { UserActivity, UserProfile } from "./user-content-types";

interface UserOverviewSectionProps {
  profile: UserProfile | undefined;
  activities: UserActivity[] | undefined;
  simulationsCompleted: number;
  formatDate: (timestamp: Date | number) => string;
  getActivityDisplayName: (type: string) => string;
  onOpenProfile: () => void;
  onOpenSimulations: () => void;
}

export function UserOverviewSection({
  profile,
  activities,
  simulationsCompleted,
  formatDate,
  getActivityDisplayName,
  onOpenProfile,
  onOpenSimulations,
}: UserOverviewSectionProps) {
  return (
    <>
      <DashboardSection
        title="Overview"
        description="Here you can find a quick summary of your profile, activities, and available simulations to continue your learning journey."
      >
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <DashboardPanel
            className="group cursor-pointer p-6 transition-all hover:bg-card/50"
            onClick={onOpenProfile}
          >
            <div className="mb-4 inline-flex rounded bg-primary-green px-2 py-1 text-xs font-semibold text-text-inverse">
              Profile
            </div>
            <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary-green">
              Keep your information updated
            </h3>
            <p className="text-sm text-gray-400">
              Edit your name, email, and preferences to receive more relevant
              suggestions.
            </p>
          </DashboardPanel>

          <DashboardPanel
            className="group cursor-pointer p-6 transition-all hover:bg-card/50"
            onClick={onOpenSimulations}
          >
            <div className="mb-4 inline-flex rounded bg-primary-violet px-2 py-1 text-xs font-semibold text-text-inverse">
              Simulations
            </div>
            <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary-violet">
              Access active sessions
            </h3>
            <p className="text-sm text-gray-400">
              Continue ongoing simulations or explore new clinical scenarios.
            </p>
          </DashboardPanel>

          <DashboardPanel className="group cursor-pointer p-6 transition-all hover:bg-card/50">
            <div className="mb-4 inline-flex rounded bg-primary-yellow px-2 py-1 text-xs font-semibold text-text-inverse">
              Progress
            </div>
            <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary-yellow">
              Analyze your growth
            </h3>
            <p className="text-sm text-gray-400">
              Review your evaluations and monitor the growth of your skills.
            </p>
          </DashboardPanel>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DashboardMetricCard
            value={activities?.length ?? 0}
            label="Recorded activities"
          />
          <DashboardMetricCard
            value={simulationsCompleted}
            label="Completed simulations"
          />
          <DashboardMetricCard
            value={profile?.role === "admin" ? "Admin" : "User"}
            label="Account role"
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Recent Activities"
        description="A selection of the latest actions recorded while using the platform."
      >
        {activities && activities.length > 0 ? (
          <DashboardPanel>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/5"
                >
                  <div>
                    <div className="mb-1 font-medium text-text-primary">
                      {getActivityDisplayName(activity.type)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground">
                    {activity.type}
                  </span>
                </div>
              ))}
            </div>
          </DashboardPanel>
        ) : (
          <DashboardPanel className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <div className="mb-4 text-4xl opacity-20">📝</div>
            <p>
              Your activities will appear here as soon as you start using the
              platform.
            </p>
          </DashboardPanel>
        )}
      </DashboardSection>
    </>
  );
}

interface UserProfileFormValues {
  name: string;
  email: string;
}

interface UserProfileSectionProps {
  profile: UserProfile | undefined;
  profileLoading: boolean;
  isEditingProfile: boolean;
  form: UseFormReturn<UserProfileFormValues>;
  isSubmitting: boolean;
  onSubmit: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function UserProfileSection({
  profile,
  profileLoading,
  isEditingProfile,
  form,
  isSubmitting,
  onSubmit,
  onEdit,
  onCancel,
}: UserProfileSectionProps) {
  if (profileLoading) {
    return (
      <DashboardSection
        title={<Skeleton className="h-8 w-48" />}
        description={<Skeleton className="h-4 w-64" />}
      >
        <DashboardPanel>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
        </DashboardPanel>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="User Profile"
      description="Manage your account information"
    >
      <DashboardPanel>
        {isEditingProfile ? (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={(field.value as string) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        value={(field.value as string) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Name
                </Label>
                <p className="text-lg font-medium text-text-primary">
                  {profile?.name || "Not specified"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <p className="text-lg font-medium text-text-primary">
                  {profile?.email || "Not specified"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Role
                </Label>
                <div>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {profile?.role === "admin" ? "Admin" : "User"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-border/50 pt-4">
              <Button onClick={onEdit}>Edit Profile</Button>
            </div>
          </div>
        )}
      </DashboardPanel>
    </DashboardSection>
  );
}

interface UserActivitiesSectionProps {
  activities: UserActivity[] | undefined;
  activitiesLoading: boolean;
  formatDate: (timestamp: Date | number) => string;
  getActivityDisplayName: (type: string) => string;
}

export function UserActivitiesSection({
  activities,
  activitiesLoading,
  formatDate,
  getActivityDisplayName,
}: UserActivitiesSectionProps) {
  return (
    <DashboardSection
      title="Recent Activities"
      description="History of your activity on the platform"
    >
      {activitiesLoading ? (
        <DashboardPanel>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </DashboardPanel>
      ) : activities && activities.length > 0 ? (
        <DashboardPanel>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/5"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-text-primary">
                    {getActivityDisplayName(activity.type)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                      {activity.type}
                    </span>
                    <span>•</span>
                    <span>{formatDate(activity.createdAt)}</span>
                  </div>
                </div>

                {activity.metadata && (
                  <div className="hidden max-w-[200px] truncate rounded bg-black/40 p-2 text-xs sm:block">
                    Metadata available
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardPanel>
      ) : (
        <DashboardPanel className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <div className="mb-4 text-4xl opacity-20">📝</div>
          <p>
            Your activities will be recorded automatically while using
            LLMPatients.
          </p>
        </DashboardPanel>
      )}
    </DashboardSection>
  );
}
