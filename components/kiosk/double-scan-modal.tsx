"use client";

import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MEAL_NAME_MAP } from "@/lib/constants";

interface DoubleScanModalProps {
  open: boolean;
  onClose: () => void;
  onAddExtraServing: () => void;
  employeeName: string;
  mealName: string;
  existingScanTime: string;
}

export function DoubleScanModal({
  open,
  onClose,
  onAddExtraServing,
  employeeName,
  mealName,
  existingScanTime,
}: DoubleScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 border border-slate-700 rounded-lg [&>button]:text-slate-400 [&>button]:hover:text-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/20">
              <Copy className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-slate-100">Давхар бүртгэл</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Энэ ажилтан аль хэдийн бүртгүүлсэн байна
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-lg bg-slate-900 border border-slate-800 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Ажилтан:</span>
            <span className="font-medium text-slate-100">{employeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Хоол:</span>
            <span className="font-medium text-slate-100">
              {getMealName(mealName)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Өмнөх бүртгэлийн цаг:</span>
            <span className="font-medium text-slate-100">
              {new Date(existingScanTime).toLocaleTimeString("mn-MN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
            Болих
          </Button>
          <Button
            onClick={onAddExtraServing}
            className="bg-blue-600 text-white border-0 hover:bg-blue-500">
            Нэмэлт порц
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getMealName(mealType: string) {
  return MEAL_NAME_MAP[mealType as keyof typeof MEAL_NAME_MAP] || mealType;
}
