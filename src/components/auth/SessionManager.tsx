// src/components/auth/SessionManager.tsx
import React from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Tablet, MapPin, Clock, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";

const getDeviceIcon = (userAgent?: string) => {
  if (!userAgent) return <Monitor className="w-5 h-5" />;
  
  if (/Mobile|Android|iPhone/.test(userAgent)) {
    return <Smartphone className="w-5 h-5" />;
  } else if (/iPad|Tablet/.test(userAgent)) {
    return <Tablet className="w-5 h-5" />;
  }
  return <Monitor className="w-5 h-5" />;
};

const formatLastActivity = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
};

const getBrowserName = (userAgent?: string): string => {
  if (!userAgent) return "Unknown Browser";
  
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  
  return "Unknown Browser";
};

export function SessionManager() {
  const sessions = useQuery(api.authSecurity.getActiveSessions);
  const revokeSession = useMutation(api.authSecurity.revokeSession);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession({ sessionId: sessionId as any });
      toast.success("Session revoked successfully");
    } catch (error) {
      toast.error("Failed to revoke session");
    }
  };

  if (!sessions) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Monitor className="w-6 h-6" />
        Active Sessions
      </h3>

      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Monitor className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            <div
              key={session._id}
              className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  {getDeviceIcon(session.userAgent)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">
                      {getBrowserName(session.userAgent)}
                    </h4>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                      Current
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {session.ipAddress && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{session.ipAddress}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastActivity(session.lastActivity)}</span>
                    </div>
                  </div>
                  
                  {session.userAgent && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {session.userAgent}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleRevokeSession(session._id)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Revoke session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-blue-400 mt-0.5">
            ℹ️
          </div>
          <div>
            <h4 className="text-blue-300 font-medium mb-1">Session Security</h4>
            <p className="text-blue-200 text-sm">
              If you see any suspicious sessions, revoke them immediately and change your password.
              Sessions automatically expire after 7 days of inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
