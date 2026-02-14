"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Employee } from "@/lib/db";

export function useEmployees() {
  const employees = useLiveQuery(() => db.employees.toArray());

  const findByCode = useCallback(async (code: string): Promise<Employee | undefined> => {
    return db.employees.where("employeeCode").equals(code).first();
  }, []);

  const findByIdcard = useCallback(async (idcardNumber: string): Promise<Employee | undefined> => {
    return db.employees.where("idcardNumber").equals(idcardNumber).first();
  }, []);

  const totalCount = useLiveQuery(() => db.employees.count());

  return {
    employees: employees ?? [],
    findByCode,
    findByIdcard,
    totalCount: totalCount ?? 0,
    isLoading: employees === undefined,
  };
}
