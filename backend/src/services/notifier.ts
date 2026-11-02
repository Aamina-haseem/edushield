import { createNotifications, type NewNotification } from '../db/notifications.js';
import { findUserIdForStudent, listUserIdsByRole } from '../db/users.js';
import type { Intervention, Prediction, Student } from '../../../contracts/types.js';

/**
 * Turns domain events into in-app notifications. Every function here is best-effort: a
 * notification that fails to save is logged and dropped, never allowed to fail the action
 * (a prediction or an intervention) that triggered it.
 */

async function deliver(items: NewNotification[]) {
  try {
    await createNotifications(items);
  } catch (err) {
    console.error('Notification delivery failed', err);
  }
}

/** Staff who should hear about a student: their assigned advisor, or every admin when the
 * student has no advisor yet. */
async function staffFor(student: Student): Promise<string[]> {
  return student.advisorId ? [student.advisorId] : listUserIdsByRole('admin');
}

/** Only a move INTO the high tier is news — re-scoring a student who was already HIGH stays quiet. */
export async function notifyPrediction(student: Student, prediction: Prediction, previousTier: Prediction['riskTier'] | null) {
  if (prediction.riskTier !== 'HIGH' || previousTier === 'HIGH') return;
  const recipients = await staffFor(student);
  await deliver(recipients.map((userId) => ({
    userId,
    type: 'prediction',
    title: `High dropout risk: ${student.name}`,
    message: `${student.name} (${student.studentNumber}) scored ${prediction.riskScore}% with ${prediction.modelVersion}. Review the explanation and consider an intervention.`,
    relatedStudentId: student.id,
  })));
}

export async function notifyInterventionCreated(student: Student, intervention: Intervention, actorId: string) {
  const items: NewNotification[] = [];
  const studentUserId = await findUserIdForStudent(student.id);
  if (studentUserId) {
    items.push({
      userId: studentUserId,
      type: 'intervention',
      title: 'A support plan has been created for you',
      message: `Your advisor team recommends: ${intervention.recommendedActions.join('; ')}.`,
      relatedStudentId: student.id,
    });
  }
  if (intervention.assignedAdvisorId && intervention.assignedAdvisorId !== actorId) {
    items.push({
      userId: intervention.assignedAdvisorId,
      type: 'intervention',
      title: `New support plan assigned: ${student.name}`,
      message: `A ${intervention.tier}-tier intervention for ${student.name} (${student.studentNumber}) has been assigned to you.`,
      relatedStudentId: student.id,
    });
  }
  await deliver(items);
}

export async function notifyMeetingScheduled(student: Student, intervention: Intervention, actorId: string) {
  if (!intervention.nextMeetingAt) return;
  const when = new Date(intervention.nextMeetingAt).toUTCString();
  const items: NewNotification[] = [];
  const studentUserId = await findUserIdForStudent(student.id);
  if (studentUserId) {
    items.push({ userId: studentUserId, type: 'meeting', title: 'Advisor meeting scheduled', message: `Your next support meeting is on ${when}.`, relatedStudentId: student.id });
  }
  if (intervention.assignedAdvisorId && intervention.assignedAdvisorId !== actorId) {
    items.push({
      userId: intervention.assignedAdvisorId,
      type: 'meeting',
      title: `Meeting scheduled: ${student.name}`,
      message: `A support meeting with ${student.name} is scheduled for ${when}.`,
      relatedStudentId: student.id,
    });
  }
  await deliver(items);
}

export async function notifyBatchComplete(actorId: string, scored: number, failed: number, highRisk: number) {
  await deliver([{
    userId: actorId,
    type: 'system',
    title: 'Batch re-scoring complete',
    message: `${scored} students re-scored${failed ? `, ${failed} failed` : ''}. ${highRisk} are now in the high-risk tier.`,
    relatedStudentId: null,
  }]);
}
