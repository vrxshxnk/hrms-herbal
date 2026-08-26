import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { createAttendanceRecordSchema } from "@/app/validations/phase1_schema";



export async function GET(request: Request){
    const client = await getPool().connect(); 
    try {
        const getAttendanceRecords = await client.query(`
            SELECT 
                   id, 
                   employee_id, 
                   attendance_date,
                   status, 
                   check_in_time,
                   check_out_time,
                   working_hours,
                   location_id,
                   shift_id,
                   source
            FROM attendance_records
            `);
        const result = getAttendanceRecords.rows;
        return ok(result);  
    } catch (error) {
        console.log("Error while fetching atttendance records", error);
        return apiError("INTERNAL_ERROR", "Failed to get attendance", 500);
    }
}


export async function POST(request : Request){
    const parsed = await parseJson(request, createAttendanceRecordSchema);
    if(parsed.error) return parsed.error; 
    const data = parsed.data; 
    try {
        const attendanceQuery= await withTranscations(async(client)=>{
             const result = await client.query(`
                INSERT INTO attendance_records(
                            employee_id,
                            attendance_date,
                            status,
                            check_in_time,
                            check_out_time,
                            working_hours,
                            location_id,
                            shift_id,
                            source
                            )
                    VALUES ($1, $2,$3,$4,$5,$6,$7,$8,$9)
                    `, [data.employee_id,
                        data.attendance_date,
                        data.status,
                        data.check_in_time,
                        data.check_out_time,
                        data.working_hours,
                        data.location_id,
                        data.shift_id,
                        data.source
                    ]);
            return result.rows[0];
        });

        return ok(attendanceQuery);
    } catch (error) {
        console.log("Error while creating attendance", error);
        return apiError("INTERNAL_ERROR", "Failed to create attendance", 500); 
    }
}