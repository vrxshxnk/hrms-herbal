import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";

export async function PATCH(request:Request) {
    const client = await getPool().connect();
    try {
        const body = await request.json(); 
        const {id, status, approved_by, rejection_reason}= body; 
        if(!id || !['Appoved','Rejected'].includes(status)){
             return apiError("BAD_REQUEST","Invalid payload, 'id' and valid 'status' are required!", 400);
        }

        if(status === 'Rejected' && !rejection_reason){
             return apiError("BAD_REQUEST", "A rejection reason is required when status is 'Rejected'! ", 400);
        }
        const updateQuery= `
                           UPDATE leave_requests
                           SET 
                              status = $1,
                              approved_by= $2,
                              rejection_reason= $3,
                              action_taken_at= CURRENT_TIMESTAMP,
                              updated_at = CURRENT_TIMESTAMP
                            WHERE id = $4
                            RETURNING *;
                            `;
        const queryParams= [
                        status,
                        approved_by || null,
                        status === 'Rejected' ? rejection_reason : null,
                        id
        ];
        const result = await client.query(updateQuery, queryParams);
        if(result.rowCount ===0 )  {
            return  apiError("NOT_FOUND", "Leave request record not found",404);
        }
        return ok({
            message: `Leave request successfully ${status.toLowercase()}`,
            data:result.rows[0]
        });
    } catch (error) {
        console.error("Error updating leave request status:", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to update leave request status",
      500
    );
    }finally{
        client.release();
    }
}