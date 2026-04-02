"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useAppToast } from "~/hooks/useAppToast";
import { api } from "~/trpc/react";

import {
  UserActivitiesSection,
  UserOverviewSection,
  UserProfileSection,
} from "./UserContentSections";
import type { UserActivity, UserProfile } from "./user-content-types";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must contain fewer than 50 characters"),
  email: z.string().trim().email("Enter a valid email"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const UserContent = React.memo(function UserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useAppToast();
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

  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section === "overview" ||
      section === "profile" ||
      section === "activities"
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
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    );

  const typedProfile = profile as UserProfile | undefined;
  const typedActivities = activities as UserActivity[] | undefined;

  const updateProfile = api.dashboard.updateProfile.useMutation({
    onSuccess: async () => {
      setIsEditingProfile(false);
      success("Profile updated", "Your profile changes have been saved.");
      await refetchProfile();
    },
  });

  useEffect(() => {
    if (!typedProfile || isEditingProfile) {
      return;
    }

    profileForm.reset({
      name: typedProfile.name ?? "",
      email: typedProfile.email ?? "",
    });
  }, [isEditingProfile, profileForm, typedProfile]);

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
      });
      setIsEditingProfile(false);
    } catch (submitError) {
      showError(
        "Unable to update profile",
        submitError instanceof Error
          ? submitError.message
          : "Please try again in a few moments.",
      );
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
          <UserOverviewSection
            profile={typedProfile}
            activities={typedActivities}
            simulationsCompleted={simulationsCompleted}
            formatDate={formatDate}
            getActivityDisplayName={getActivityDisplayName}
            onOpenProfile={() => setSelectedSection("profile")}
            onOpenSimulations={() => router.push("/dashboard/therapeutic-journey")}
          />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <UserProfileSection
            profile={typedProfile}
            profileLoading={profileLoading}
            isEditingProfile={isEditingProfile}
            form={profileForm}
            isSubmitting={updateProfile.isPending}
            onSubmit={() => void handleProfileSubmit()}
            onEdit={handleEditProfile}
            onCancel={handleCancelEdit}
          />
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <UserActivitiesSection
            activities={typedActivities}
            activitiesLoading={activitiesLoading}
            formatDate={formatDate}
            getActivityDisplayName={getActivityDisplayName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});
