
import { db } from '../db';
import { notificationsTable, lightningStrikesTable, userLocationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq } from 'drizzle-orm';

export async function sendEmailNotification(notification: Notification): Promise<boolean> {
  try {
    // Get lightning strike details
    const strikeResults = await db.select()
      .from(lightningStrikesTable)
      .where(eq(lightningStrikesTable.id, notification.lightning_strike_id))
      .execute();

    if (strikeResults.length === 0) {
      console.error('Lightning strike not found:', notification.lightning_strike_id);
      return false;
    }

    const strike = strikeResults[0];

    // Get user location details
    const locationResults = await db.select()
      .from(userLocationsTable)
      .where(eq(userLocationsTable.user_id, notification.user_id))
      .execute();

    if (locationResults.length === 0) {
      console.error('User location not found:', notification.user_id);
      return false;
    }

    const userLocation = locationResults[0];

    // Simulate email sending (in real implementation, would use email service)
    const emailContent = formatEmailContent(
      notification,
      {
        ...strike,
        latitude: parseFloat(strike.latitude),
        longitude: parseFloat(strike.longitude),
        intensity: parseFloat(strike.intensity)
      },
      {
        city: userLocation.city,
        state: userLocation.state,
        zip_code: userLocation.zip_code
      }
    );

    // Simulate email service call
    const emailSent = await simulateEmailService(notification.user_id, emailContent);

    if (emailSent) {
      // Update notification record with email sent status
      await db.update(notificationsTable)
        .set({
          email_sent: true,
          email_sent_at: new Date()
        })
        .where(eq(notificationsTable.id, notification.id))
        .execute();

      return true;
    }

    return false;
  } catch (error) {
    console.error('Email notification failed:', error);
    return false;
  }
}

function formatEmailContent(
  notification: Notification,
  strike: { timestamp: Date; latitude: number; longitude: number; intensity: number },
  userLocation: { city: string; state: string; zip_code: string }
): string {
  return `
Lightning Strike Alert!

A lightning strike was detected ${parseFloat(notification.distance_miles.toString()).toFixed(1)} miles from your location in ${userLocation.city}, ${userLocation.state} (${userLocation.zip_code}).

Strike Details:
- Time: ${strike.timestamp.toLocaleString()}
- Location: ${strike.latitude.toFixed(4)}, ${strike.longitude.toFixed(4)}
- Intensity: ${strike.intensity}
- Distance from you: ${parseFloat(notification.distance_miles.toString()).toFixed(1)} miles

Stay safe!
  `.trim();
}

async function simulateEmailService(userId: string, content: string): Promise<boolean> {
  // In a real implementation, this would call an email service like SendGrid or AWS SES
  // For now, we simulate success for testing purposes
  console.log(`Sending email to user ${userId}:`, content);
  
  // Simulate potential email service failures
  if (userId === 'fail-user') {
    return false;
  }
  
  return true;
}
