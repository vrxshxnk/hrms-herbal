import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { createDesignationSchema } from "@/app/validations/phase1_schema";




export async function GET (request : Request){
    try {
        const client = await getPool().connect(); 
        const getDesignation = await client.query(`
            SELECT  
                  id,
                  code,
                  title, 
                  grade_level
                FROM designations
               `);
        const result = getDesignation.rows; 
        return ok(result);
    } catch (error) {
        console.log("Error while fetchign designations", error);
        return apiError("INTERNAL_ERROR", "Failed to get the designations", 500);
    }
}


export async function POST(request: Request){
    const  parsed = await parseJson(request, createDesignationSchema);
    if(parsed.error) return parsed.error; 
    const data = parsed.data; 
    try {
        const insertDesignationQuery = await withTranscations(async (client)=>{
               const result = await client.query(`INSERT INTO designations(code, title, grade_level)
            VALUES ($1, $2,$3)
            RETURNING id, code, title, grade_level
            `,[data.code, data.title, data.grade_level]);
            return result.rows[0];
        });
        return ok(insertDesignationQuery); 
    } catch (error) {
        console.log("Error while creating the designation", error); 
        return apiError("INTERNAL_ERROR", "Failed to create the designations", 500);
    }
}