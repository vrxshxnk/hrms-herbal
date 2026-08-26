

import { apiError, ok } from "@/app/lib/api/response"
import { getPool } from "@/app/lib/api/client"
import { parseJson } from "@/app/lib/api/validation";
import { createDepartmentSchema } from "@/app/validations/phase1_schema";


export async function GET(request:Request) {
    const client = await getPool().connect(); 
    try {
        const getDepartments = await client.query(`
            SELECT 
                   id, 
                   business_unit_id,
                   parent_department_id,
                   code, 
                   name
            FROM departments 
        `);
        const result = getDepartments.rows; 
        return ok(result);
    } catch (error) {
        console.log(error, "Error while fetching departments");
        return apiError("INTERNAL_ERROR", 'Failed to get the departments', 500);
    }finally{
        client.release();
    }
}


export async function POST(request: Request){
    const client = await getPool().connect();
    const parsed = await parseJson(request, createDepartmentSchema);
    if(parsed.error) return parsed.error;
    const data = parsed.data; 
    try {
        await client.query("BEGIN"); 
        const query = await client.query(`
         INSERT INTO departments(
          business_unit_id,
          parent_department_id,
          code,
          name
         )VALUES($1, $2, $3, $4)
         RETURNING *
         `,[data.business_unit_id,
            data.parent_department_id,
            data.code,
            data.name
         ]);
        await client.query('COMMIT');
        return ok({
            success: true,
            department : query,
            message: "Successfully created the departments!"
        });
    } catch (error) {
         await client.query("ROLLBACK");
        console.log("Error while creating the departments", error);
        return apiError("INTERNAL_ERROR", "Failed to create departments", 500);
    }finally{
        client.release();
    }
}
