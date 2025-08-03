
import { db } from '../db';
import { notificationsTable, lightningStrikesTable } from '../db/schema';
import { type GetUserLocationInput, type Notification } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserNotifications(input: GetUserLocationInput): Promise<Notification[]> {
  try {
    // Query notifications with joined lightning strike data
    const results = await db.select()
      .from(notificationsTable)
      .innerJoin(lightningStrikesTable, eq(notificationsTable.lightning_strike_id, lightningStrikesTable.id))
      .where(eq(notificationsTable.user_id, input.user_id))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Transform joined results back to notification format with proper numeric conversions
    return results.map(result => ({
      id: result.notifications.id,
      user_id: result.notifications.user_id,
      lightning_strike_id: result.notifications.lightning_strike_id,
      distance_miles: parseFloat(result.notifications.distance_miles),
      email_sent: result.notifications.email_sent,
      email_sent_at: result.notifications.email_sent_at,
      created_at: result.notifications.created_at
    }));
  } catch (error) {
    console.error('Get user notifications failed:', error);
    throw error;
  }
}
