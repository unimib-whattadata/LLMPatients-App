"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { DashboardSection, DashboardPanel, DashboardMetricCard } from "~/components/dashboard/ui";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: Date | null;
  image: string | null;
};

type UserActivity = {
  id: number;
  type: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must contain fewer than 50 characters"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const UserContent = React.memo(function UserContent() {
  const [selectedSection, setSelectedSection] = useState<
    "overview" | "profile" | "activities"
  >("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const searchParams = useSearchParams();


  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section &&
      (section === "overview" ||
        section === "profile" ||
        section === "activities")
    ) {
      setSelectedSection(section);
    }
  }, [searchParams]);

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = api.dashboard.getUserProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: activities, isLoading: activitiesLoading } =
    api.dashboard.getUserActivity.useQuery(
      { limit: 20 },
      {
        staleTime: 2 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    );


  const typedProfile = profile as UserProfile | undefined;
  const typedActivities = activities as UserActivity[] | undefined;


  const updateProfile = api.dashboard.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingProfile(false);
      void refetchProfile();
    },
  });

  React.useEffect(() => {
    if (typedProfile && !isEditingProfile) {
      profileForm.reset({
        name: typedProfile.name ?? "",
        email: typedProfile.email ?? "",
      });
    }
  }, [typedProfile, isEditingProfile, profileForm]);


  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
      });
      setIsEditingProfile(false);
    } catch (error) {
      // Silent catch
    }
  });


  const formatDate = (timestamp: Date | number) => {
    const date =
      typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp;
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityDisplayName = (type: string) => {
    switch (type) {
      case "login":
        return "Signed in";
      case "profile_update":
        return "Profile updated";
      case "dashboard_view":
        return "Dashboard viewed";
      case "simulation":
        return "Simulation completed";
      default:
        return type;
    }
  };


  const simulationsCompleted = useMemo(
    () =>
      typedActivities?.filter((activity) => activity.type === "simulation")
        .length ?? 0,
    [typedActivities],
  );


  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  return (
    <div className="dashboard-panel-stack">
      <Tabs
        value={selectedSection}
        onValueChange={(value) =>
          setSelectedSection(value as "overview" | "profile" | "activities")
        }
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardSection
            title="Overview"
            description="Here you can find a quick summary of your profile, activities, and available simulations to continue your learning journey."
          >

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <DashboardPanel className="p-6 hover:bg-card/50 transition-all cursor-pointer group" onClick={() => setSelectedSection("profile")}>
                <div className="mb-4 inline-flex px-2 py-1 rounded text-xs font-semibold bg-primary-green text-text-inverse">
                  Profile
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-green transition-colors">
                  Keep your information updated
                </h3>
                <p className="text-sm text-gray-400">
                  Edit your name, email, and preferences to receive more relevant suggestions.
                </p>
              </DashboardPanel>

              <DashboardPanel className="p-6 hover:bg-card/50 transition-all cursor-pointer group" onClick={() => window.location.href = "/dashboard/therapeutic-journey"}>
                <div className="mb-4 inline-flex px-2 py-1 rounded text-xs font-semibold bg-primary-violet text-text-inverse">
                  Simulations
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-violet transition-colors">
                  Access active sessions
                </h3>
                <p className="text-sm text-gray-400">
                  Continue ongoing simulations or explore new clinical scenarios.
                </p>
              </DashboardPanel>

              <DashboardPanel className="p-6 hover:bg-card/50 transition-all cursor-pointer group">
                <div className="mb-4 inline-flex px-2 py-1 rounded text-xs font-semibold bg-primary-yellow text-text-inverse">
                  Progress
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-yellow transition-colors">
                  Analyze your growth
                </h3>
                <p className="text-sm text-gray-400">
                  Review your evaluations and monitor the growth of your skills.
                </p>
              </DashboardPanel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardMetricCard
                value={typedActivities?.length ?? 0}
                label="Recorded activities"
              />
              <DashboardMetricCard
                value={simulationsCompleted}
                label="Completed simulations"
              />
              <DashboardMetricCard
                value={typedProfile?.role === "admin" ? "Admin" : "User"}
                label="Account role"
              />
            </div>
          </DashboardSection>

          <DashboardSection
            title="Recent Activities"
            description="A selection of the latest actions recorded while using the platform."
          >

            {typedActivities && typedActivities.length > 0 ? (
              <DashboardPanel>
                <div className="space-y-4">
                  {typedActivities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                      <div>
                        <div className="font-medium text-text-primary mb-1">
                          {getActivityDisplayName(activity.type)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-mono">
                        {activity.type}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            ) : (
              <DashboardPanel className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-4xl mb-4 opacity-20">📝</div>
                <p>
                  Your activities will appear here as soon as you start using the platform.
                </p>
              </DashboardPanel>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {profileLoading ? (
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
          ) : (
            <DashboardSection
              title="User Profile"
              description="Manage your account information"
            >
              <DashboardPanel>
                {isEditingProfile ? (
                  <Form {...profileForm}>
                    <form
                      onSubmit={handleProfileSubmit}
                      className="space-y-4"
                    >
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          isLoading={updateProfile.isPending}
                          disabled={updateProfile.isPending}
                        >
                          {updateProfile.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                          Name
                        </Label>
                        <p className="font-medium text-lg text-text-primary">
                          {typedProfile?.name || "Not specified"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                          Email
                        </Label>
                        <p className="font-medium text-lg text-text-primary">
                          {typedProfile?.email || "Not specified"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                          Role
                        </Label>
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {typedProfile?.role === "admin" ? "Admin" : "User"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-border/50">
                      <Button onClick={handleEditProfile}>
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                )}
              </DashboardPanel>
            </DashboardSection>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
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
            ) : typedActivities && typedActivities.length > 0 ? (
              <DashboardPanel>
                <div className="space-y-4">
                  {typedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-text-primary">
                          {getActivityDisplayName(activity.type)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                            {activity.type}
                          </span>
                          <span>•</span>
                          <span>{formatDate(activity.createdAt)}</span>
                        </div>
                      </div>

                      {activity.metadata && (
                        <div className="hidden sm:block text-xs bg-black/40 p-2 rounded max-w-[200px] overflow-hidden truncate">
                          Metadata available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            ) : (
              <DashboardPanel className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-4xl mb-4 opacity-20">📝</div>
                <p>
                  Your activities will be recorded automatically while using LLMPatients.
                </p>
              </DashboardPanel>
            )}
          </DashboardSection>
        </TabsContent>
      </Tabs>
    </div>
  );
});
