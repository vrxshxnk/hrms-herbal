import { PoolClient } from "pg";

export interface CreateNotificationParams {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  referenceType?: string;
}

export async function createNotification(
  client: PoolClient,
  params: CreateNotificationParams
) {
  const query = `
    INSERT INTO notifications (
      recipient_id,
      title,
      message,
      type,
      reference_id,
      reference_type
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    params.recipientId,
    params.title,
    params.message,
    params.type,
    params.referenceId || null,
    params.referenceType || null,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}