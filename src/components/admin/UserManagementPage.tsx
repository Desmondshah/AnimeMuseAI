// BRUTALIST USER MANAGEMENT - UserManagementPage.tsx
import React, { useState, memo, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";
import StyledButton from "../animuse/shared/StyledButton";

// BRUTALIST loading component
const BrutalistLoading: React.FC = memo(() => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-black border-4 border-white">
      <div className="relative w-24 h-24 mb-8 border-4 border-white">
        <div className={`absolute inset-0 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-4 w-16 h-16 bg-white"></div>
      </div>
      
      <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-wider">
        LOADING USERS
      </h3>
      
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 bg-white ${shouldReduceAnimations ? 'opacity-100' : 'animate-pulse'}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});

// BRUTALIST user card component
const BrutalistUserCard: React.FC<{
  user: Doc<"userProfiles">;
  onEdit: (user: Doc<"userProfiles">) => void;
  onDelete: (userId: string) => void;
}> = memo(({ user, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="bg-black border-4 border-white p-6 hover:bg-white hover:text-black transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-6 mb-6">
        <div className="w-16 h-16 bg-white text-black flex items-center justify-center border-4 border-black font-black text-2xl">
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wider">
            {user.name || 'UNKNOWN USER'}
          </h3>
          <p className="text-lg text-white font-bold uppercase tracking-wide">
            {user.phoneNumber || 'NO PHONE'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 ${user.isAdmin ? 'bg-purple-500' : 'bg-green-500'}`}></div>
          <span className="text-lg font-black text-white uppercase tracking-wide">
            {user.isAdmin ? 'ADMIN' : 'USER'}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6 text-lg">
        <div>
          <div className="text-white font-bold uppercase tracking-wide mb-2">JOINED</div>
          <div className="text-white font-black">
            {user._creationTime ? new Date(user._creationTime).toLocaleDateString() : 'UNKNOWN'}
          </div>
        </div>
        <div>
          <div className="text-white font-bold uppercase tracking-wide mb-2">STATUS</div>
          <div className="text-white font-black">
            {user.phoneNumberVerified ? 'VERIFIED' : 'UNVERIFIED'}
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={() => onEdit(user)}
          className="flex-1 bg-white text-black hover:bg-gray-100 border-4 border-black px-4 py-3 font-black uppercase tracking-wide transition-colors"
        >
          EDIT
        </button>
        <button
          onClick={() => onDelete(user._id)}
          className="bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 px-4 py-3 font-black uppercase tracking-wide transition-colors"
        >
          DELETE
        </button>
      </div>
    </div>
  );
});

// BRUTALIST filter component
const BrutalistFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = memo(({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white text-black border-4 border-black px-6 py-4 text-lg font-black uppercase tracking-wide placeholder-black/50 focus:outline-none focus:border-gray-500 transition-colors"
    />
    <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-black text-2xl">
      🔍
    </div>
  </div>
));

const UserManagementPageComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editingUser, setEditingUser] = useState<Doc<"userProfiles"> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  
  const users = useQuery(api.admin.getAllUserProfilesForAdmin) || [];
  
  const filteredUsers = useMemo(() => {
    return users.filter((user: Doc<"userProfiles">) => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.phoneNumber?.includes(searchTerm);
      const matchesRole = filterRole === "all" || 
                         (filterRole === "admin" && user.isAdmin) ||
                         (filterRole === "user" && !user.isAdmin);
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u: Doc<"userProfiles">) => u.isAdmin).length;
    const verified = users.filter((u: Doc<"userProfiles">) => u.phoneNumberVerified).length;
    const recent = users.filter((u: Doc<"userProfiles">) => {
      const creationTime = new Date(u._creationTime);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return creationTime > weekAgo;
    }).length;
    
    return { total, admins, verified, recent };
  }, [users]);

  const handleEditUser = (user: Doc<"userProfiles">) => {
    setEditingUser(user);
  };

  const handleDeleteUser = (userId: string) => {
    setShowDeleteConfirm(userId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      // TODO: Implement delete user mutation
      console.log("Deleting user:", showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  if (!users) {
    return <BrutalistLoading />;
  }

  return (
    <div className="space-y-8">
      {/* BRUTALIST HEADER */}
      <div className="bg-white border-4 border-black p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black text-black mb-4 uppercase tracking-wider">
              USER MANAGEMENT
            </h1>
            <p className="text-2xl text-black font-bold uppercase tracking-wide">
              MANAGE USER ACCOUNTS, PERMISSIONS, AND SYSTEM ACCESS
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              className="bg-black text-white hover:bg-gray-800 border-4 border-black px-8 py-4 font-black uppercase tracking-wide transition-colors"
            >
              EXPORT DATA
            </button>
            <button
              className="bg-green-500 text-white hover:bg-green-600 border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide transition-colors"
            >
              ADD USER
            </button>
          </div>
        </div>
      </div>

      {/* BRUTALIST STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOTAL USERS', value: stats.total.toString(), color: 'bg-blue-500' },
          { label: 'ADMINS', value: stats.admins.toString(), color: 'bg-purple-500' },
          { label: 'VERIFIED', value: stats.verified.toString(), color: 'bg-green-500' },
          { label: 'NEW THIS WEEK', value: stats.recent.toString(), color: 'bg-orange-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-black border-4 border-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-6 h-6 ${stat.color}`}></div>
            </div>
            <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
            <div className="text-lg text-white font-bold uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* BRUTALIST FILTERS */}
      <div className="bg-white border-4 border-black p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BrutalistFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="SEARCH USERS..."
          />
          
          <div className="flex gap-4">
            {[
              { value: "all", label: "ALL" },
              { value: "admin", label: "ADMINS" },
              { value: "user", label: "USERS" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterRole(filter.value)}
                className={`px-6 py-4 font-black uppercase tracking-wide border-4 transition-colors
                  ${filterRole === filter.value 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black border-black hover:bg-gray-100'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BRUTALIST USER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user: Doc<"userProfiles">) => (
          <BrutalistUserCard
            key={user._id}
            user={user}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        ))}
      </div>

      {/* BRUTALIST EMPTY STATE */}
      {filteredUsers.length === 0 && (
        <div className="bg-black border-4 border-white p-12 text-center">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-wider">
            NO USERS FOUND
          </h3>
          <p className="text-xl text-white font-bold uppercase tracking-wide">
            TRY ADJUSTING YOUR SEARCH OR FILTER CRITERIA
          </p>
        </div>
      )}

      {/* BRUTALIST DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-white border-4 border-black p-8 max-w-md w-full">
            <h3 className="text-3xl font-black text-black mb-6 uppercase tracking-wider">
              CONFIRM DELETE
            </h3>
            <p className="text-lg text-black font-bold mb-8 uppercase tracking-wide">
              ARE YOU SURE YOU WANT TO DELETE THIS USER? THIS ACTION CANNOT BE UNDONE.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-white text-black border-4 border-black px-6 py-3 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white border-4 border-red-500 px-6 py-3 font-black uppercase tracking-wide hover:bg-red-600 transition-colors"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(UserManagementPageComponent);