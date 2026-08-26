import {  z, ZodError, type ZodTypeAny } from "zod";
import { apiError } from "./response";

export async function parseJson<Tschema extends ZodTypeAny>(
  request: Request,
  schema: Tschema,
): Promise<
  | { data: z.infer<Tschema>; error: null }
  | { data: null; error: ReturnType<typeof apiError> }
> {
  try {
    const body = await request.json();
    return {data: schema.parse(body), error:null};
  } catch (error) {
     if(error instanceof ZodError){
        return{
            data: null,
            error: apiError("VALIDATION_ERROR", "Request validation failed", 422, error.flatten())
        };
     }
     return {
        data:null,
        error:apiError("BAD_REQUEST", "Request body must be valid json",400)
     }
  }
}
