// src/components/auth/TwoFactorSetup.tsx
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Copy, Check, Key, Download } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

// Generate backup codes
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Generate TOTP secret (simplified - in production use a proper library)
const generateSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [backupSaved, setBackupSaved] = useState(false);

  const setupTwoFactor = useMutation(api.authSecurity.setupTwoFactor);

  useEffect(() => {
    // Generate secret and QR code on component mount
    const newSecret = generateSecret();
    setSecret(newSecret);
    setBackupCodes(generateBackupCodes());

    // Generate QR code URL for authenticator apps
    const appName = "AnimeMuseAI";
    const userEmail = "user@example.com"; // This should come from props or context
    const qrUrl = `otpauth://totp/${appName}:${userEmail}?secret=${newSecret}&issuer=${appName}`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`);
  }, []);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCodeCopied(true);
      toast.success("Secret copied to clipboard!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy secret");
    }
  };

  const handleVerifyCode = () => {
    // In a real implementation, you'd verify the TOTP code here
    // For now, we'll accept any 6-digit code
    if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
      setStep("backup");
    } else {
      toast.error("Please enter a valid 6-digit code");
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `AnimeMuseAI Two-Factor Authentication Backup Codes\n\nGenerated on: ${new Date().toLocaleDateString()}\n\nBackup Codes (use each code only once):\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nKeep these codes in a safe place. You can use them to access your account if you lose your authenticator device.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animuseai-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setBackupSaved(true);
    toast.success("Backup codes downloaded!");
  };

  const handleComplete = async () => {
    try {
      await setupTwoFactor({
        secret,
        backupCodes,
      });
      toast.success("Two-factor authentication enabled!");
      onComplete();
    } catch (error) {
      toast.error("Failed to enable two-factor authentication");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Set Up Two-Factor Authentication
            </h2>
            <p className="text-gray-400 text-sm">
              Add an extra layer of security to your account
            </p>
          </div>

          {/* Step 1: Setup */}
          {step === "setup" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                
                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>

                {/* Manual entry option */}
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2 bg-gray-700 p-3 rounded-lg">
                    <code className="flex-1 text-green-400 font-mono text-sm break-all">
                      {secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Copy secret"
                    >
                      {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep("verify")}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 transition-all"
              >
                Continue to Verification
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === "verify" && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-4 text-center">
                  Enter the 6-digit code from your authenticator app to verify the setup
                </p>
                
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("setup")}
                  className="flex-1 py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup codes */}
          {step === "backup" && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-4 text-center">
                  Save these backup codes in a safe place. You can use them to access your account if you lose your device.
                </p>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="text-green-400 font-mono text-sm text-center py-1">
                        {code}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="w-full py-2 bg-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup Codes
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="backupSaved"
                    checked={backupSaved}
                    onChange={(e) => setBackupSaved(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="backupSaved" className="text-gray-300 text-sm">
                    I have saved my backup codes in a safe place
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!backupSaved}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Enable 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
