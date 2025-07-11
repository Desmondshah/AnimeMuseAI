// src/components/auth/SecuritySettings.tsx
import React, { useState } from "react";
import { toast } from "sonner";
import { Shield, Key, Smartphone, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { SessionManager } from "./SessionManager";
import { TwoFactorSetup } from "./TwoFactorSetup";

export function SecuritySettings() {
  const [activeTab, setActiveTab] = useState<"overview" | "password" | "2fa" | "sessions">("overview");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    // TODO: Implement password change API call
    toast.success("Password changed successfully");
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const SecurityTab = ({ id, label, icon, isActive, onClick }: {
    id: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-all ${
        isActive 
          ? 'bg-purple-600 text-white' 
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (show2FASetup) {
    return (
      <TwoFactorSetup
        onComplete={() => {
          setShow2FASetup(false);
          toast.success("Two-factor authentication enabled successfully!");
        }}
        onCancel={() => setShow2FASetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Security Settings</h1>
          <p className="text-gray-400">Manage your account security and privacy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <nav className="space-y-2">
                <SecurityTab
                  id="overview"
                  label="Overview"
                  icon={<Shield className="w-5 h-5" />}
                  isActive={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                />
                <SecurityTab
                  id="password"
                  label="Password"
                  icon={<Key className="w-5 h-5" />}
                  isActive={activeTab === "password"}
                  onClick={() => setActiveTab("password")}
                />
                <SecurityTab
                  id="2fa"
                  label="Two-Factor Auth"
                  icon={<Smartphone className="w-5 h-5" />}
                  isActive={activeTab === "2fa"}
                  onClick={() => setActiveTab("2fa")}
                />
                <SecurityTab
                  id="sessions"
                  label="Sessions"
                  icon={<Eye className="w-5 h-5" />}
                  isActive={activeTab === "sessions"}
                  onClick={() => setActiveTab("sessions")}
                />
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Security Score */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Security Score</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-yellow-500 to-green-500 h-3 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-2xl font-bold text-white">75/100</span>
                  </div>
                  <p className="text-gray-400 mb-4">Good security! Consider enabling two-factor authentication for better protection.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Strong Password</span>
                      </div>
                      <p className="text-green-200 text-sm">Your password meets security requirements</p>
                    </div>
                    
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">2FA Not Enabled</span>
                      </div>
                      <p className="text-yellow-200 text-sm">Enable two-factor authentication for extra security</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab("password")}
                      className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-600/50 transition-all text-left"
                    >
                      <Key className="w-6 h-6 text-blue-400 mb-2" />
                      <h4 className="text-white font-medium mb-1">Change Password</h4>
                      <p className="text-gray-400 text-sm">Update your account password</p>
                    </button>
                    
                    <button
                      onClick={() => setShow2FASetup(true)}
                      className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-600/50 transition-all text-left"
                    >
                      <Smartphone className="w-6 h-6 text-green-400 mb-2" />
                      <h4 className="text-white font-medium mb-1">Enable 2FA</h4>
                      <p className="text-gray-400 text-sm">Add two-factor authentication</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
                
                {!showPasswordForm ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-6">
                      For your security, we recommend changing your password regularly.
                    </p>
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowPasswordForm(false)}
                        className="flex-1 py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                      >
                        Change Password
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2FA Tab */}
            {activeTab === "2fa" && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Two-Factor Authentication</h3>
                
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-6">
                    Two-factor authentication is not enabled. Add an extra layer of security to your account.
                  </p>
                  <button
                    onClick={() => setShow2FASetup(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 transition-all"
                  >
                    Enable Two-Factor Authentication
                  </button>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && <SessionManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
