// Enhanced UserManagementPage.tsx with dramatic visual upgrades
import React, { memo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Type definitions
interface UserProfile {
  _id: Id<"userProfiles">;
  userId: Id<"users">;
  name?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  onboardingCompleted?: boolean;
  isAdmin?: boolean;
}

// Enhanced Loading Component
const FuturisticLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col justify-center items-center h-64 py-10">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-green-500/20"></div>
        <div className={`absolute inset-1 rounded-full border-4 border-blue-500/40 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }}></div>
        <div className={`absolute inset-2 rounded-full border-4 border-emerald-500 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full"></div>
      </div>
      
      <h3 className="text-xl font-heading bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
        {message || "Loading User Profiles..."}
      </h3>
    </div>
  );
});

// Enhanced User Card Component
const UserCard: React.FC<{
  profile: UserProfile;
  onToggleAdmin: () => void;
  isCurrentUser: boolean;
  isLastAdmin: boolean;
}> = memo(({ profile, onToggleAdmin, isCurrentUser, isLastAdmin }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();

  const getStatusBadge = (status: boolean | undefined, type: 'verified' | 'onboarded' | 'admin' = 'verified') => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full border";
    
    if (status) {
      switch (type) {
        case 'verified':
          return `${baseClasses} bg-green-500/20 text-green-300 border-green-500/30`;
        case 'onboarded':
          return `${baseClasses} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case 'admin':
          return `${baseClasses} bg-purple-500/20 text-purple-300 border-purple-500/30`;
        default:
          return `${baseClasses} bg-green-500/20 text-green-300 border-green-500/30`;
      }
    } else {
      return `${baseClasses} bg-red-500/20 text-red-300 border-red-500/30`;
    }
  };

  const getRoleGradient = (isAdmin: boolean) => {
    return isAdmin 
      ? "from-purple-600 to-pink-600" 
      : "from-blue-600 to-cyan-600";
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${getRoleGradient(!!profile.isAdmin)} p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110'} transition-all duration-300 shadow-lg hover:shadow-2xl`}>
      
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getRoleGradient(!!profile.isAdmin)} opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl`}></div>
      
      {/* Inner card */}
      <div className="relative bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleGradient(!!profile.isAdmin)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : profile.userId.charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-brand-accent-gold transition-colors">
                {profile.name || "Unnamed User"}
              </h3>
              <p className="text-xs text-white/60 font-mono">
                ID: {profile.userId.substring(0, 8)}...
              </p>
            </div>
          </div>
          
          {/* Role badge */}
          <div className={getStatusBadge(profile.isAdmin, 'admin')}>
            {profile.isAdmin ? '👑 Admin' : '👤 User'}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Phone:</span>
            <span className="text-sm text-white font-medium">
              {profile.phoneNumber || "Not provided"}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Verified:</span>
            <span className={getStatusBadge(profile.phoneNumberVerified, 'verified')}>
              {profile.phoneNumberVerified ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Onboarded:</span>
            <span className={getStatusBadge(profile.onboardingCompleted, 'onboarded')}>
              {profile.onboardingCompleted ? '✅ Yes' : '❌ No'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onToggleAdmin}
          disabled={isCurrentUser && !!profile.isAdmin && isLastAdmin}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border
            ${profile.isAdmin 
              ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white border-red-500/30' 
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-green-500/30'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {profile.isAdmin ? '🔻 Revoke Admin' : '🔺 Make Admin'}
        </button>
        
        {isCurrentUser && !!profile.isAdmin && isLastAdmin && (
          <p className="text-xs text-yellow-400 mt-2 text-center">
            ⚠️ Cannot remove last admin
          </p>
        )}
      </div>
    </div>
  );
});

// Stats Card Component
const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: string;
  gradient: string;
  percentage?: string;
}> = memo(({ title, value, icon, gradient, percentage }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110'} transition-all duration-300`}>
      <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4 h-full border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl">{icon}</div>
          {percentage && (
            <div className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
              {percentage}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-white/70">{title}</div>
      </div>
    </div>
  );
});

const UserManagementPageComponent: React.FC = () => {
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified'>('all');

  const userProfiles = useQuery(api.admin.getAllUserProfilesForAdmin);
  const setUserAdminStatus = useMutation(api.admin.adminSetUserAdminStatus);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleSetAdminStatus = async (targetUserId: Id<"users">, currentIsAdmin: boolean | undefined, targetUserName: string | undefined) => {
    const newIsAdmin = !currentIsAdmin;
    const actionText = newIsAdmin ? "promote to admin" : "revoke admin status from";

    if (loggedInUser?._id === targetUserId && !newIsAdmin) {
      const adminUsers = userProfiles?.filter((p: UserProfile) => p.isAdmin);
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
    return <FuturisticLoadingSpinner message="Loading user profiles..." />;
  }

  if (userProfiles === null) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-xl text-red-400 mb-2">Access Denied</h3>
        <p className="text-white/70">Could not load user profiles. Ensure you are an administrator.</p>
      </div>
    );
  }

  // Calculate stats
  const totalUsers = userProfiles.length;
  const adminUsers = userProfiles.filter((p: UserProfile) => p.isAdmin).length;
  const verifiedUsers = userProfiles.filter((p: UserProfile) => p.phoneNumberVerified).length;
  const onboardedUsers = userProfiles.filter((p: UserProfile) => p.onboardingCompleted).length;

  // Filter users
  const filteredUsers = userProfiles.filter((profile: UserProfile) => {
    const matchesSearch = !searchTerm || 
      profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.phoneNumber?.includes(searchTerm) ||
      profile.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'admin' && profile.isAdmin) ||
      (filterRole === 'user' && !profile.isAdmin);
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'verified' && profile.phoneNumberVerified) ||
      (filterStatus === 'unverified' && !profile.phoneNumberVerified);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/50 via-teal-900/50 to-cyan-900/50 p-6 border border-white/10">
        <div className="relative z-10">
          <h2 className="text-3xl font-heading bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent mb-4">
            👥 User Management Center
          </h2>
          <p className="text-white/70 mb-4">Manage user accounts, permissions, and monitor platform activity.</p>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon="👥"
          gradient="from-blue-600 to-cyan-600"
          percentage="+5.2%"
        />
        <StatsCard
          title="Administrators"
          value={adminUsers}
          icon="👑"
          gradient="from-purple-600 to-pink-600"
        />
        <StatsCard
          title="Verified"
          value={verifiedUsers}
          icon="✅"
          gradient="from-green-600 to-emerald-600"
          percentage={`${Math.round((verifiedUsers / totalUsers) * 100)}%`}
        />
        <StatsCard
          title="Onboarded"
          value={onboardedUsers}
          icon="🎯"
          gradient="from-orange-600 to-red-600"
          percentage={`${Math.round((onboardedUsers / totalUsers) * 100)}%`}
        />
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/40">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/50 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 px-4 text-white focus:border-emerald-500 focus:outline-none transition-colors"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admins Only</option>
          <option value="user">Users Only</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 px-4 text-white focus:border-emerald-500 focus:outline-none transition-colors"
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl text-white/70 mb-2">No users found</h3>
          <p className="text-white/50">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((profile: UserProfile) => (
            <UserCard
              key={profile._id}
              profile={profile}
              onToggleAdmin={() => handleSetAdminStatus(profile.userId, profile.isAdmin, profile.name)}
              isCurrentUser={loggedInUser?._id === profile.userId}
              isLastAdmin={!!profile.isAdmin && userProfiles.filter((p: UserProfile) => p.isAdmin).length === 1}
            />
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/70">
          <span>Showing {filteredUsers.length} of {totalUsers} users</span>
          <div className="flex gap-4">
            <span>🔐 {adminUsers} admins</span>
            <span>✅ {verifiedUsers} verified</span>
            <span>🎯 {onboardedUsers} onboarded</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(UserManagementPageComponent);