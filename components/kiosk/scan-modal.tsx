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
  employeeName,
  message,
}: ScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl bg-slate-950 border border-slate-700 rounded-xl p-8 sm:p-10 [&>button]:text-slate-400 [&>button]:hover:text-slate-200">
        <DialogHeader className="gap-5">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/20">
              <AlertTriangle className="h-9 w-9 text-amber-400" />
            </div>
            <DialogTitle className="text-3xl font-bold leading-tight text-slate-100">
              Зөвшөөрөлгүй хандалт
            </DialogTitle>
          </div>
          <DialogDescription className="text-xl leading-relaxed text-slate-300">
            {message}
          </DialogDescription>
        </DialogHeader>
        {employeeName && (
          <div className="space-y-3 rounded-lg bg-slate-900 border border-slate-800 p-5 text-lg">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-400">Ажилтан:</span>
              <span className="font-medium text-slate-100">{employeeName}</span>
            </div>
          </div>
        )}
        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-14 px-8 text-lg bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
            Болих
          </Button>
          <Button
            onClick={onApproveManually}
            className="h-14 px-8 text-lg bg-blue-600 text-white border-0 hover:bg-blue-500">
            Гараар зөвшөөрөх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
