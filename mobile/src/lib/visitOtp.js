import { api } from '../api/client';

/** Nurse: request OTP for start_visit or complete_visit. */
export async function sendVisitOtp(requestId, purpose) {
  const { data } = await api.post(`/requests/${requestId}/otp/send`, { purpose });
  return data;
}

/** Nurse: verify OTP and transition visit status. */
export async function verifyVisitOtp(requestId, purpose, otp) {
  const { data } = await api.post(`/requests/${requestId}/otp/verify`, {
    purpose,
    otp: String(otp).trim(),
  });
  return data;
}

export const VISIT_OTP_COPY = {
  start_visit: {
    title: 'Start visit',
    hint: 'Ask the patient for the 6-digit OTP sent to their app. GPS is not required.',
    success: 'Visit started. You can begin the service.',
  },
  complete_visit: {
    title: 'End service',
    hint: 'Ask the patient for the completion OTP to close this visit.',
    success: 'Service completed. Great job!',
  },
};
