import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cloud, CheckCircle, HardDrive, Shield, Settings, HelpCircle, X, ArrowUpRight, Smartphone } from "lucide-react";
import { AccountInfo } from "../types";
import { formatBytes } from "../utils/mediaUtils";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountInfo | null;
  isUploading: boolean;
  uploadProgress: number;
}

export function AccountModal({ isOpen, onClose, account, isUploading, uploadProgress }: AccountModalProps) {
  if (!isOpen) return null;

  const usedBytes = account?.storageUsedBytes || 48 * 1024 * 1024;
  const totalBytes = account?.storageTotalBytes || 40 * 1024 * 1024 * 1024;
  const usedPercent = Math.min(100, Math.max(1, (usedBytes / totalBytes) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden text-[#1f1f1f] border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-gray-700">Google</span>
              <span className="text-xs text-gray-400">Account</span>
            </div>
            <div className="w-9"></div>
          </div>

          {/* User Profile Card */}
          <div className="px-4 pb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-lg flex items-center justify-center shadow-sm">
              YB
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {account?.email || "youboreme@yopmail.com"}
              </div>
              <div className="text-xs text-blue-600 font-medium">OpenStack Swift Connected</div>
            </div>
          </div>

          {/* Backup Status Box */}
          <div className="mx-4 mb-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isUploading ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {isUploading ? (
                <Cloud className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {isUploading ? `Backing up items (${uploadProgress}%)` : "Backup is complete"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {isUploading ? "Uploading to Swift container..." : "All media synced with Blomp Cloud"}
              </div>
            </div>
          </div>

          {/* Account Storage Meter */}
          <div className="mx-4 mb-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-700">Account storage</span>
              </div>
              <span className="text-xs font-bold text-blue-600">{usedPercent.toFixed(1)}% used</span>
            </div>

            {/* Storage Progress Bar */}
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, usedPercent)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600 font-medium">
              <span>{formatBytes(usedBytes)} of 40 GB used</span>
              <span className="text-gray-400">Blomp Tier</span>
            </div>
          </div>

          {/* Actions List */}
          <div className="px-2 pb-3 space-y-0.5 text-sm text-gray-700">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-500" />
                <span className="font-normal">Free up space on this device</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-normal">Photos settings</span>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="font-normal">Privacy & Blomp Storage policy</span>
              </div>
            </button>
          </div>

          {/* Footer Note */}
          <div className="py-2.5 px-4 bg-gray-100/70 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Blomp OpenStack Swift 40GB</span>
            <span>v2.0 Keystone</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
