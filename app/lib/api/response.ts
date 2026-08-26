
import { NextResponse } from "next/server";

export type ApiErrorCode =  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "WORKFLOW_ERROR"
  | "INTERNAL_ERROR";


  export function ok<T>(data: T, meta?:Record<string, unknown>, status= 200){
     return NextResponse.json({data, meta:meta ?? {}}, {status});
  }


  export function created<T>(data: T, meta?:Record<string, unknown>){
    return ok(data, meta, 201);
  }


  export function apiError(code: ApiErrorCode,message: string, status = 400, details?:unknown){
      return NextResponse.json({
           data: null,
           error:{
               code,
               message,
               details: details ?? null
           }
      }, {status});
  }

  export function getPagination(searchParams: URLSearchParams){
      const page= Math.max(Number(searchParams.get("page") ?? 1),1);
      const pageSize= Math.min(Math.max(Number(searchParams.get("pagesize") ?? 25),1),100);

      return {page,pageSize, limit:pageSize,offset:(page-1) * pageSize};
  }