import React, { useState } from "react";
import { User, Shield, GraduationCap, Award, Check, CirclePower, Edit3 } from "lucide-react";
import { BrutalCard } from "../components/ui/BrutalCard";
import { BrutalButton } from "../components/ui/BrutalButton";
import { useAuthStore } from "../stores/authStore";
import { useCourseStore } from "../stores/courseStore";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const toggleRole = useAuthStore((state) => state.toggleRole);
  const logout = useAuthStore((state) => state.logout);

  const userEnrollments = useCourseStore((state) => state.userEnrollments);
  const allCourses = useCourseStore((state) => state.allCourses);

  const isCreator = user?.user_metadata?.role === "creator";
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "NACOS Scholar");
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const completedCount = userEnrollments.filter((e) => e.progress === 100).length;
  const inProgressCount = userEnrollments.filter((e) => e.progress > 0 && e.progress < 100).length;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!user) return;
    const updated = {
      ...user,
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName.trim(),
      },
    };
    setUser(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="site-container py-8 space-y-6 font-sans max-w-4xl mx-auto">
        <div className="space-y-1 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#0056D2]/10 text-[#0056D2]">
              <User size={16} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Scholar Profile & Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your Upskill Hub account, toggle between Learner and Creator modes, and review milestones.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-[#0056D2] dark:text-[#1d72fe] text-xs font-semibold flex items-center gap-2">
            <Check size={14} />
            <span>Profile name updated successfully.</span>
          </div>
        )}

        {/* Profile Card */}
        <BrutalCard className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#0056D2] text-white font-bold text-lg flex items-center justify-center shadow-md">
                {(fullName || "NS")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
                <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      isCreator
                        ? "bg-[#0056D2] text-white"
                        : "bg-secondary text-foreground border border-border"
                    }`}
                  >
                    {isCreator ? "Creator Mode Active" : "Learner Mode Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <BrutalButton
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 size={13} className="mr-1.5" />
                <span>{isEditing ? "Cancel" : "Edit Name"}</span>
              </BrutalButton>

              <BrutalButton
                variant={isCreator ? "default" : "primary"}
                size="sm"
                onClick={toggleRole}
                title="Switch role"
              >
                <Shield size={13} className="mr-1.5" />
                <span>Switch to {isCreator ? "Learner" : "Creator"}</span>
              </BrutalButton>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="pt-4 border-t border-border flex gap-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="flex-1 px-3 py-2 text-xs sm:text-sm border border-border bg-background rounded-md outline-none focus:border-foreground"
              />
              <BrutalButton type="submit" variant="primary" size="sm">
                Save
              </BrutalButton>
            </form>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="p-3.5 bg-secondary/50 rounded-lg border border-border space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground">Enrolled Tracks</span>
              <p className="text-xl font-bold">{userEnrollments.length}</p>
            </div>

            <div className="p-3.5 bg-secondary/50 rounded-lg border border-border space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground">In Progress</span>
              <p className="text-xl font-bold">{inProgressCount}</p>
            </div>

            <div className="p-3.5 bg-secondary/50 rounded-lg border border-border space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground">Completed</span>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
          </div>
        </BrutalCard>

        {/* Account Reset / Sign out */}
        <BrutalCard className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground">Sign Out of Upskill Hub</h3>
            <p className="text-xs text-muted-foreground">Reset current local session data on this browser.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CirclePower size={14} />
            <span>Sign Out</span>
          </button>
        </BrutalCard>
      </div>
  );
}

export default ProfilePage;
