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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Зөвшөөрөлгүй хандалт</DialogTitle>
          </div>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {employeeName && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ажилтан:</span>
              <span className="font-medium">{employeeName}</span>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={onApproveManually}>
            Гараар зөвшөөрөх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
