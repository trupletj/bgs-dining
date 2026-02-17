"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
  onApproveManually: () => void;
  scannedCode: string;
  employeeName?: string;
  message: string;
}

export function ScanModal({
  open,
  onClose,
  onApproveManually,
  scannedCode,
  employeeName,
  message,
}: ScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[rgba(15,23,42,0.85)] backdrop-blur-2xl border border-white/10 shadow-[0_8px_60px_-10px_rgba(0,0,0,0.5)] rounded-2xl [&>button]:text-slate-400 [&>button]:hover:text-slate-200 [&>button]:hover:bg-white/5">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/20 shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)]">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-slate-100">Зөвшөөрөлгүй хандалт</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">{message}</DialogDescription>
        </DialogHeader>
        {employeeName && (
          <div className="space-y-2 rounded-xl bg-slate-800/50 border border-white/5 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Ажилтан:</span>
              <span className="font-medium text-slate-100">{employeeName}</span>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-800/60 border-white/10 text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
          >
            Болих
          </Button>
          <Button
            onClick={onApproveManually}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            Гараар зөвшөөрөх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
