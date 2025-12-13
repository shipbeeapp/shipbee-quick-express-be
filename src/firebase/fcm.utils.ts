import admin from './firebase.js'

export async function sendFcmNotification(fcmToken: string, payload: { title: string, body: string, data?: any }) {
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    });
  } catch (err) {
    console.error("Error sending FCM notification:", err);
  }
}