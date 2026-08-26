import { Pool, type PoolClient, type QueryResultRow } from "pg";


let pool :Pool | undefined; 

export function getPool(){
    if(!process.env.DATABASE_URL){
        throw new Error ("DATABASE_URL ir required");
    }
    pool ??= new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10
    });
    return pool;
};



export async function withTranscations<T>(callback: (client : PoolClient)=>Promise<T>){
    const client = await getPool().connect(); 
    try {
        await client.query("begin");
        const result = await callback(client);
        await client.query("commit");
        return result; 
    } catch (error) {
        await client.query("rollback");
        throw error;
    }finally{
        client.release(); 
    }
}