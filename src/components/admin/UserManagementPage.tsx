// src/components/admin/UserManagementPage.tsx
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api"; // Adjusted path
import { Doc, Id } from "../../../convex/_generated/dataModel"; // Adjusted path
import StyledButton from "../animuse/shared/StyledButton"; // Adjusted path
import { toast } from "sonner";
// import { format } from 'date-fns'; // Keep if you need to format dates

const UserManagementPage: React.FC = () => {
  // Assuming api.admin.getAllUserProfilesForAdmin fetches the updated userProfiles schema
  const userProfiles = useQuery(api.admin.getAllUserProfilesForAdmin);
  const setUserAdminStatus = useMutation(api.admin.adminSetUserAdminStatus);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleSetAdminStatus = async (targetUserId: Id<"users">, isAdmin: boolean) => {
    if (loggedInUser?._id === targetUserId && !isAdmin) {
        const currentAdmins = userProfiles?.filter(p => p.isAdmin && p.userId !== targetUserId);
        if (!currentAdmins || currentAdmins.length === 0) {
            toast.error("Cannot remove admin status from the only admin.");
            return;
        }
    }

    try {
      await setUserAdminStatus({ targetUserId, isAdmin });
      toast.success(`User admin status updated successfully!`);
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Failed to update admin status.");
      console.error("Failed to set admin status:", error);
    }
  };


  if (userProfiles === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-brand-text-secondary">Loading user profiles...</p>
      </div>
    );
  }

  if (userProfiles === null) {
    return <p className="text-brand-text-secondary p-4">Could not load user profiles. Ensure you are logged in as an admin.</p>;
  }


  return (
    <div>
      <h2 className="text-2xl font-orbitron text-neon-cyan mb-6">User Management</h2>
      {userProfiles.length === 0 ? (
        <p className="text-brand-text-secondary">No user profiles found.</p>
      ) : (
        <div className="overflow-x-auto neumorphic-card bg-brand-dark p-0 shadow-neumorphic-light-inset">
          <table className="min-w-full divide-y divide-brand-surface">
            <thead className="bg-brand-surface/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">User ID</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Phone Number</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Phone Verified</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Onboarded</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Is Admin</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark">
              {userProfiles.map((profile) => (
                <tr key={profile._id} className="hover:bg-brand-surface/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text">{profile.name || "N/A"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-brand-text-secondary" title={profile.userId.toString()}>{profile.userId.substring(0,10)}...</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text-secondary">{profile.phoneNumber || "N/A"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {profile.phoneNumberVerified ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-700 text-green-100">Yes</span>
                    ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-700 text-yellow-100">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {profile.onboardingCompleted ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-700 text-green-100">Yes</span>
                    ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-700 text-red-100">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     {profile.isAdmin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-sky-700 text-sky-100">Admin</span>
                    ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-700 text-gray-100">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                    <StyledButton
                      onClick={() => handleSetAdminStatus(profile.userId, !profile.isAdmin)}
                      variant={profile.isAdmin ? "secondary_small" : "primary_small"}
                      className="text-xs"
                      disabled={loggedInUser?._id === profile.userId && profile.isAdmin && userProfiles.filter(p=>p.isAdmin).length === 1}
                    >
                      {profile.isAdmin ? "Revoke Admin" : "Make Admin"}
                    </StyledButton>
                    {/* Add other actions like 'View Details', 'Edit Profile' later */}
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

export default UserManagementPage;