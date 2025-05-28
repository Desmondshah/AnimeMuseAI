// src/components/admin/UserManagementPage.tsx
import React, { memo } from "react"; // Added memo
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel"; // Doc not directly used for props here
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
// import { format } from 'date-fns'; // Not used in the provided original code

// Themed Loading Spinner
const AdminLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-primary/80"> {/* Text for light background */}
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    {message && <p className="mt-3 text-sm">{message}</p>}
  </div>
));

const UserManagementPageComponent: React.FC = () => {
  const userProfiles = useQuery(api.admin.getAllUserProfilesForAdmin);
  const setUserAdminStatus = useMutation(api.admin.adminSetUserAdminStatus);
  const loggedInUser = useQuery(api.auth.loggedInUser); // To prevent self-demotion if last admin

  const handleSetAdminStatus = async (targetUserId: Id<"users">, currentIsAdmin: boolean | undefined, targetUserName: string | undefined) => {
    const newIsAdmin = !currentIsAdmin;
    const actionText = newIsAdmin ? "promote to admin" : "revoke admin status from";

    if (loggedInUser?._id === targetUserId && !newIsAdmin) {
      const adminUsers = userProfiles?.filter(p => p.isAdmin);
      if (adminUsers?.length === 1) {
          toast.error("Cannot remove admin status from the only remaining admin.");
          return;
      }
    }

    if (window.confirm(`Are you sure you want to ${actionText} ${targetUserName || 'this user'}?`)) {
        try {
          toast.loading(`${newIsAdmin ? "Promoting" : "Revoking"}...`, {id: `admin-status-${targetUserId}`});
          await setUserAdminStatus({ targetUserId, isAdmin: newIsAdmin });
          toast.success(`User ${targetUserName || targetUserId} admin status updated successfully!`, {id: `admin-status-${targetUserId}`});
        } catch (error: any) {
          toast.error(error.data?.message || error.message || "Failed to update admin status.", {id: `admin-status-${targetUserId}`});
          console.error("Failed to set admin status:", error);
        }
    }
  };

  if (userProfiles === undefined) {
    return <AdminLoadingSpinner message="Loading user profiles..." />;
  }

  // This case indicates an auth error or actual null from backend, not just empty.
  if (userProfiles === null) {
    return <p className="text-brand-text-primary/70 p-4 text-center">Could not load user profiles. Ensure you are an administrator.</p>;
  }

  const getStatusBadgeClass = (isActive: boolean | undefined, type: 'positive' | 'negative' | 'neutral' = 'positive') => {
    if (isActive === undefined) return "bg-gray-200 text-gray-700"; // Undefined state
    if (isActive) {
        return type === 'positive' ? "bg-brand-accent-gold/80 text-brand-surface" : 
               type === 'neutral' ? "bg-blue-500/80 text-white" : // Example for neutral admin
               "bg-brand-accent-gold/80 text-brand-surface"; // Default positive
    } else {
        return type === 'negative' ? "bg-red-400/80 text-white" : // Specific for "No" if needed
               "bg-brand-text-primary/20 text-brand-text-primary/80"; // Default negative/neutral
    }
  };


  return (
    // This component is rendered inside AdminDashboardPage's content area (bg-brand-background/10 or bg-brand-accent-peach/10)
    // So, text here should be text-brand-text-primary or text-brand-text-on-dark depending on chosen admin content area bg.
    // Assuming admin content area is light (e.g. bg-brand-accent-peach/10), primary text is dark brown.
    <div className="text-brand-text-primary">
      <h2 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-3 sm:mb-4">User Management</h2>
      {userProfiles.length === 0 ? (
        <p className="text-brand-text-primary/70 text-center py-5">No user profiles found in the system.</p>
      ) : (
        // Table container: bg-brand-surface (Cream) for contrast with the admin content area
        <div className="overflow-x-auto bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30">
          <table className="min-w-full divide-y divide-brand-accent-peach/20">
            <thead className="bg-brand-accent-peach/10">
              <tr>
                {["Name", "User ID", "Phone", "Verified", "Onboarded", "Role", "Actions"].map(header => (
                     <th key={header} className="px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold font-heading text-brand-primary-action/80 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-accent-peach/20">
              {userProfiles.map((profile) => (
                <tr key={profile._id} className="hover:bg-brand-accent-peach/10 transition-colors duration-150">
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium">{profile.name || "N/A"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-[10px] sm:text-xs text-brand-text-primary/70" title={profile.userId.toString()}>{profile.userId.substring(0,10)}...</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-brand-text-primary/80">{profile.phoneNumber || "N/A"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs">
                    <span className={`px-2 py-0.5 inline-flex text-[9px] sm:text-[10px] leading-5 font-semibold rounded-full ${getStatusBadgeClass(profile.phoneNumberVerified)}`}>
                      {profile.phoneNumberVerified ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs">
                     <span className={`px-2 py-0.5 inline-flex text-[9px] sm:text-[10px] leading-5 font-semibold rounded-full ${getStatusBadgeClass(profile.onboardingCompleted)}`}>
                      {profile.onboardingCompleted ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs">
                     <span className={`px-2 py-0.5 inline-flex text-[9px] sm:text-[10px] leading-5 font-semibold rounded-full ${getStatusBadgeClass(profile.isAdmin, profile.isAdmin ? 'neutral' : 'positive')}`}> {/* Positive here means 'not admin' is the default state */}
                      {profile.isAdmin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm">
                    <StyledButton
                      onClick={() => handleSetAdminStatus(profile.userId, profile.isAdmin, profile.name)}
                      variant={profile.isAdmin ? "secondary_small" : "primary_small"}
                      className="!text-[10px] !py-1 !px-1.5"
                      disabled={loggedInUser?._id === profile.userId && !!profile.isAdmin && userProfiles.filter(p=>p.isAdmin).length === 1}
                    >
                      {profile.isAdmin ? "Revoke Admin" : "Make Admin"}
                    </StyledButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default memo(UserManagementPageComponent);