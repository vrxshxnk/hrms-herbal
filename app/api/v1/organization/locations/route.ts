import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { createLocationSchema } from "@/app/validations/phase1_schema";


export async function GET(request:Request) {
    const client = await getPool().connect(); 
    try {
        const getLocation= await client.query(`
                  SELECT  
                        code,
                        name,
                        work_mode,
                        city,
                        state,
                        country,
                        postal_code
                  FROM locations
            `);

        const result = getLocation.rows;
        return ok(result);
    } catch (error) {
        console.log("Error while gettign the locations", error);
        return apiError("INTERNAL_ERROR", 'Failed to get the locations', 500);
    }finally{
        client.release(); 
    }
}



export async function POST(request:Request) {
    const parsed = await parseJson(request, createLocationSchema);
    if(parsed.error) return parsed.error; 
    const data = parsed.data; 
    try {
        const createLocation= await withTranscations(async(client)=>{
             const result = await client.query(`
                INSERT INTO locations
                (
                  code, 
                  name, 
                  work_mode, 
                  city, 
                  state, 
                  country, 
                  postal_code
                )
                VALUES($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                  id,
                  code,
                  name,
                  work_mode,
                  city,
                  state,
                  country,
                  postal_code
                `, [
                    data.code, 
                    data.name,
                    data.work_mode,
                    data.city,
                    data.state,
                    data.country,
                    data.postal_code
                ]);

            return result.rows[0];
        });
        return ok(createLocation);
    } catch (error) {
        console.log("Error while creating Locations", error);
        return apiError("INTERNAL_ERROR", "Failed to create location, internal server error", 500);
    }
}