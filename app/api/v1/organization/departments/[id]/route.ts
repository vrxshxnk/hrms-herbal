import { apiError, ok } from "@/app/lib/api/response";
import { withTranscations } from "@/app/lib/api/client";


export async function PATCH(request: Request, {params}: {params :Promise<{id:string}>}){
    const {id} = await params; 
    const body = await request.json();
    const {business_unit_id, parent_department_id, code, name}= body;

    try {
         const updatedDepartment= await withTranscations(async (client)=>{
             const result = await client.query(
                `
                 UPDATE departments
                 SET  
                    business_unit_id = $1, 
                    parent_department_id = $2, 
                    code= $3, 
                    name= $4
                WHERE id= $5
                RETURNING  
                    id ,
                    business_unit_id,
                    parent_department_id, 
                    code, 
                    name 
                `,[
                    business_unit_id,
                    parent_department_id,
                    code,
                    name, 
                    id
                ]
             );
             return result.rows[0];
         });

         return ok(updatedDepartment);
    } catch (error) {     
        console.log("error while updating the departments", error);
        return apiError("INTERNAL_ERROR", 'Failed to update the departments',500);
    }

}

export async function DELETE (request : Request, {params} : {params : Promise <{id: string}>}){
    const {id}= await params; 
    try {
        const deleteQuery = await withTranscations(async (client)=>{
            const result = await client.query(
                `DELETE FROM departments 
                 WHERE id=$1
                 RETURNING *`,[id]
            );
            return result.rows[0]
        });
        return ok(deleteQuery); 
    } catch (error) {       
        console.log("Error while deleting the department");
        return apiError('INTERNAL_ERROR', 'Failed to delete the departments', 500);
    }
}