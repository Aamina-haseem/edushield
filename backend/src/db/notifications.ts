import { pool } from './pool.js';
import type { Notification, NotificationType } from '../../../contracts/types.js';

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_student_id: string | null;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
    relatedStudentId: row.related_student_id,
  };
}

export async function listNotificationsForUser(userId: string): Promise<Notification[]> {
  const { rows } = await pool.query<NotificationRow>(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(toNotification);
}

export interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedStudentId: string | null;
}

export async function createNotifications(items: NewNotification[]): Promise<void> {
  for (const item of items) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, related_student_id) VALUES ($1, $2, $3, $4, $5)',
      [item.userId, item.type, item.title, item.message, item.relatedStudentId],
    );
  }
}

export async function markNotificationRead(id: string, userId: string): Promise<Notification | null> {
  const { rows } = await pool.query<NotificationRow>(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId],
  );
  return rows[0] ? toNotification(rows[0]) : null;
}
