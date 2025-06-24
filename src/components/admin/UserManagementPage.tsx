// BRUTALIST USER MANAGEMENT - UserManagementPage.tsx
import React, { useState, memo, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useMobileOptimizations, useAdminLayoutOptimization } from "../../../convex/useMobileOptimizations";
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

// BRUTALIST user card component - iPad Optimized
const BrutalistUserCard: React.FC<{
  user: Doc<"userProfiles">;
  onEdit: (user: Doc<"userProfiles">) => void;
  onDelete: (userId: string) => void;
}> = memo(({ user, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { iPad } = useMobileOptimizations();
  
  return (
    <div
      className={`bg-black border-4 border-white hover:bg-white hover:text-black transition-all duration-200 touch-target-ipad ${
        iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center mb-4 md:mb-6 ${
        iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
      }`}>
        <div className={`bg-white text-black flex items-center justify-center border-4 border-black font-black ${
          iPad.isIPadMini ? 'w-12 h-12 text-lg' : 
          iPad.isIPadPro12 ? 'w-20 h-20 text-3xl' : 
          'w-16 h-16 text-2xl'
        }`}>
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-black text-white mb-2 uppercase tracking-wider leading-tight truncate ${
            iPad.isIPadMini ? 'text-lg' : 
            iPad.isIPadPro12 ? 'text-2xl md:text-3xl' : 
            'text-xl md:text-2xl'
          }`}>
            {user.name || 'UNKNOWN USER'}
          </h3>
          <p className={`text-white font-bold uppercase tracking-wide truncate ${
            iPad.isIPadMini ? 'text-sm' : 
            iPad.isIPadPro12 ? 'text-lg md:text-xl' : 
            'text-base md:text-lg'
          }`}>
            {user.phoneNumber || 'NO PHONE'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className={`${
            iPad.isIPadMini ? 'w-3 h-3' : 'w-4 h-4'
          } ${user.isAdmin ? 'bg-purple-500' : 'bg-green-500'}`}></div>
          <span className={`font-black text-white uppercase tracking-wide ${
            iPad.isIPadMini ? 'text-sm' : 
            iPad.isIPadPro12 ? 'text-lg' : 
            'text-base md:text-lg'
          }`}>
            {user.isAdmin ? 'ADMIN' : 'USER'}
          </span>
        </div>
      </div>
      
      <div className={`grid grid-cols-2 mb-4 md:mb-6 ${
        iPad.isIPadMini ? 'gap-3 text-sm' : 
        iPad.isIPadPro12 ? 'gap-8 text-lg md:text-xl' : 
        'gap-6 text-base md:text-lg'
      }`}>
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
      
      <div className={`flex ${iPad.isIPadMini ? 'gap-2' : iPad.isIPadPro12 ? 'gap-6' : 'gap-4'}`}>
        <button
          onClick={() => onEdit(user)}
          className={`flex-1 bg-white text-black hover:bg-gray-100 border-4 border-black font-black uppercase tracking-wide transition-colors touch-target-ipad ${
            iPad.isIPadMini ? 'px-3 py-2 text-sm' : 
            iPad.isIPadPro12 ? 'px-6 py-4 text-lg' : 
            'px-4 py-3 text-base'
          }`}
        >
          EDIT
        </button>
        <button
          onClick={() => onDelete(user._id)}
          className={`bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 font-black uppercase tracking-wide transition-colors touch-target-ipad ${
            iPad.isIPadMini ? 'px-3 py-2 text-sm' : 
            iPad.isIPadPro12 ? 'px-6 py-4 text-lg' : 
            'px-4 py-3 text-base'
          }`}
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
  
  const { isMobile, shouldReduceAnimations, iPad, isLandscape } = useMobileOptimizations();
  const { getGridClasses } = useAdminLayoutOptimization();
  
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
    <div className={`space-y-6 md:space-y-8 ${iPad.isIPad ? 'iPad-user-management' : ''}`}>
      {/* BRUTALIST HEADER - iPad Optimized */}
      <div className={`bg-white border-4 border-black ${
        iPad.isIPadMini ? 'p-4 md:p-6' : 
        iPad.isIPadPro12 ? 'p-8 md:p-12' : 
        'p-6 md:p-8'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className={`font-black text-black mb-3 md:mb-4 uppercase tracking-wider leading-tight ${
              iPad.isIPadMini ? 'text-2xl md:text-3xl' : 
              iPad.isIPadPro12 ? 'text-4xl md:text-5xl lg:text-6xl' : 
              'text-3xl md:text-4xl lg:text-5xl'
            }`}>
              USER MANAGEMENT
            </h1>
            <p className={`text-black font-bold uppercase tracking-wide leading-relaxed ${
              iPad.isIPadMini ? 'text-sm md:text-base' : 
              iPad.isIPadPro12 ? 'text-lg md:text-xl lg:text-2xl' : 
              'text-base md:text-lg lg:text-xl'
            }`}>
              MANAGE USER ACCOUNTS, PERMISSIONS, AND SYSTEM ACCESS
            </p>
          </div>
          
          <div className={`flex items-center flex-wrap ${
            iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-6' : 'gap-4 md:gap-6'
          }`}>
            <button
              className={`bg-black text-white hover:bg-gray-800 border-4 border-black font-black uppercase tracking-wide transition-colors touch-target-ipad ${
                iPad.isIPadMini ? 'px-4 py-2 text-sm' : 
                iPad.isIPadPro12 ? 'px-8 py-4 text-lg' : 
                'px-6 py-3 text-base md:text-lg'
              }`}
            >
              EXPORT DATA
            </button>
            <button
              className={`bg-green-500 text-white hover:bg-green-600 border-4 border-green-500 font-black uppercase tracking-wide transition-colors touch-target-ipad ${
                iPad.isIPadMini ? 'px-4 py-2 text-sm' : 
                iPad.isIPadPro12 ? 'px-8 py-4 text-lg' : 
                'px-6 py-3 text-base md:text-lg'
              }`}
            >
              ADD USER
            </button>
          </div>
        </div>
      </div>

      {/* BRUTALIST STATS - iPad Optimized */}
      <div className={`${getGridClasses('stats')} ${
        iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-8' : 'gap-4 md:gap-6'
      }`}>
        {[
          { label: 'TOTAL USERS', value: stats.total.toString(), color: 'bg-blue-500' },
          { label: 'ADMINS', value: stats.admins.toString(), color: 'bg-purple-500' },
          { label: 'VERIFIED', value: stats.verified.toString(), color: 'bg-green-500' },
          { label: 'NEW THIS WEEK', value: stats.recent.toString(), color: 'bg-orange-500' },
        ].map((stat, index) => (
          <div key={index} className={`bg-black border-4 border-white ${
            iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
          }`}>
            <div className={`flex items-center justify-between ${
              iPad.isIPadMini ? 'mb-3' : 'mb-4'
            }`}>
              <div className={`${stat.color} ${
                iPad.isIPadMini ? 'w-4 h-4' : iPad.isIPadPro12 ? 'w-8 h-8' : 'w-6 h-6'
              }`}></div>
            </div>
            <div className={`font-black text-white mb-2 ${
              iPad.isIPadMini ? 'text-2xl' : 
              iPad.isIPadPro12 ? 'text-4xl md:text-5xl' : 
              'text-3xl md:text-4xl'
            }`}>{stat.value}</div>
            <div className={`text-white font-bold uppercase tracking-wide leading-tight ${
              iPad.isIPadMini ? 'text-sm' : 
              iPad.isIPadPro12 ? 'text-lg md:text-xl' : 
              'text-base md:text-lg'
            }`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* BRUTALIST FILTERS - iPad Optimized */}
      <div className={`bg-white border-4 border-black ${
        iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
      }`}>
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${
          iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
        }`}>
          <BrutalistFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="SEARCH USERS..."
          />
          
          <div className={`flex flex-wrap ${
            iPad.isIPadMini ? 'gap-2' : iPad.isIPadPro12 ? 'gap-6' : 'gap-4'
          }`}>
            {[
              { value: "all", label: "ALL" },
              { value: "admin", label: "ADMINS" },
              { value: "user", label: "USERS" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterRole(filter.value)}
                className={`border-4 transition-colors touch-target-ipad font-black uppercase tracking-wide ${
                  iPad.isIPadMini ? 'px-3 py-2 text-sm' : 
                  iPad.isIPadPro12 ? 'px-8 py-4 text-lg' : 
                  'px-6 py-4 text-base'
                } ${filterRole === filter.value 
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

      {/* BRUTALIST USER GRID - CORRECTED for proper sizing */}
      <div className="grid w-full gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        {filteredUsers.map((user: Doc<"userProfiles">) => (
          <BrutalistUserCard
            key={user._id}
            user={user}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        ))}
      </div>

      {/* BRUTALIST EMPTY STATE - iPad Optimized */}
      {filteredUsers.length === 0 && (
        <div className={`bg-black border-4 border-white text-center ${
          iPad.isIPadMini ? 'p-8' : iPad.isIPadPro12 ? 'p-16' : 'p-12'
        }`}>
          <div className={`mb-6 ${
            iPad.isIPadMini ? 'text-4xl' : iPad.isIPadPro12 ? 'text-8xl' : 'text-6xl'
          }`}>👥</div>
          <h3 className={`font-black text-white mb-4 uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-xl' : 
            iPad.isIPadPro12 ? 'text-4xl md:text-5xl' : 
            'text-2xl md:text-3xl'
          }`}>
            NO USERS FOUND
          </h3>
          <p className={`text-white font-bold uppercase tracking-wide ${
            iPad.isIPadMini ? 'text-sm' : 
            iPad.isIPadPro12 ? 'text-lg md:text-xl' : 
            'text-base md:text-lg'
          }`}>
            TRY ADJUSTING YOUR SEARCH OR FILTER CRITERIA
          </p>
        </div>
      )}

      {/* BRUTALIST DELETE CONFIRMATION - iPad Optimized */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 md:p-6">
          <div className={`bg-white border-4 border-black w-full ${
            iPad.isIPadMini ? 'p-6 max-w-sm' : 
            iPad.isIPadPro12 ? 'p-12 max-w-2xl' : 
            'p-8 max-w-md'
          }`}>
            <h3 className={`font-black text-black mb-6 uppercase tracking-wider ${
              iPad.isIPadMini ? 'text-xl' : 
              iPad.isIPadPro12 ? 'text-4xl' : 
              'text-2xl md:text-3xl'
            }`}>
              CONFIRM DELETE
            </h3>
            <p className={`text-black font-bold mb-8 uppercase tracking-wide leading-relaxed ${
              iPad.isIPadMini ? 'text-sm' : 
              iPad.isIPadPro12 ? 'text-lg md:text-xl' : 
              'text-base md:text-lg'
            }`}>
              ARE YOU SURE YOU WANT TO DELETE THIS USER? THIS ACTION CANNOT BE UNDONE.
            </p>
            <div className={`flex ${iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-6' : 'gap-4'}`}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 bg-white text-black border-4 border-black font-black uppercase tracking-wide hover:bg-gray-100 transition-colors touch-target-ipad ${
                  iPad.isIPadMini ? 'px-4 py-2 text-sm' : 
                  iPad.isIPadPro12 ? 'px-8 py-4 text-lg' : 
                  'px-6 py-3 text-base'
                }`}
              >
                CANCEL
              </button>
              <button
                onClick={confirmDelete}
                className={`flex-1 bg-red-500 text-white border-4 border-red-500 font-black uppercase tracking-wide hover:bg-red-600 transition-colors touch-target-ipad ${
                  iPad.isIPadMini ? 'px-4 py-2 text-sm' : 
                  iPad.isIPadPro12 ? 'px-8 py-4 text-lg' : 
                  'px-6 py-3 text-base'
                }`}
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