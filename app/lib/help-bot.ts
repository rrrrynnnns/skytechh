export type AppRoute = '/subscriber/my-tickets' | '/subscriber/my-transactions' | '/subscriber/plan-details';

export interface SubscriberHelpContext {
  subscriberId: string;
  firstName: string;
  currentPlan: string;
  billStatus: string | null;
  billAmount: number | null;
  billDueDate: string | null;
  billingPeriod: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  assignedTechnicianName: string | null;
  appointmentType: string | null;
  appointmentStatus: string | null;
}

export interface HelpBotReply {
  text: string;
  suggestions: string[];
  action?: AppRoute;
}

function formatAmount(amount: number | null) {
  return amount == null || Number.isNaN(amount)
    ? 'not available'
    : `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return 'not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'not available' : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function getHelpBotReply(message: string, context: SubscriberHelpContext): HelpBotReply {
  const normalized = message.trim().toLowerCase();

  if (/(disconnect|disconnection|cancel service|terminate|termination)/i.test(normalized)) {
    return {
      text: 'To disconnect your service, please submit a request so our support team can verify the account and confirm the final billing details. Before disconnecting, we can also help troubleshoot the connection, move you to a cheaper plan, or transfer service to a new address.',
      suggestions: ['File disconnection request', 'Explore cheaper plan', 'Contact retention'],
      action: '/subscriber/my-tickets',
    };
  }

  if (/(check my bill|bill status|current bill|amount due|due date)/i.test(normalized)) {
    if (!context.billingPeriod || context.billAmount == null) {
      return { text: 'There is no billing record currently available for your account.', suggestions: ['How to pay via GCash', 'Request payment extension', 'File billing ticket'], action: '/subscriber/my-tickets' };
    }
    return {
      text: `Your ${context.billingPeriod} bill is ${formatAmount(context.billAmount)}. It is due on ${formatDate(context.billDueDate)} and its status is ${context.billStatus || 'not available'}.`,
      suggestions: ['How to pay via GCash', 'Request payment extension', 'File billing ticket'],
      action: '/subscriber/my-transactions',
    };
  }

  if (/(pay|payment|gcash|how to pay|payment method|receipt)/i.test(normalized)) {
    return { text: 'You can pay through GCash or a walk-in payment. Please keep your payment reference number or receipt until the payment appears on your account.', suggestions: ['Check my bill', 'Request receipt', 'File billing ticket'], action: '/subscriber/my-transactions' };
  }

  if (/(installation|schedule|technician|appointment|visit|repair schedule)/i.test(normalized)) {
    if (!context.appointmentDate) {
      return { text: 'There is no active installation or service appointment on your account right now. You can submit a service request and our team will help schedule one.', suggestions: ['Reschedule appointment', 'Contact support', 'Submit service request'], action: '/subscriber/my-tickets' };
    }
    return {
      text: `Your ${context.appointmentType || 'service'} appointment is on ${formatDate(context.appointmentDate)} at ${context.appointmentTime || 'the scheduled time'}. Technician: ${context.assignedTechnicianName || 'not assigned yet'}. Status: ${context.appointmentStatus || 'not available'}.`,
      suggestions: ['Reschedule appointment', 'Contact support', 'Submit service request'],
      action: '/subscriber/my-tickets',
    };
  }

  if (/(no internet|offline|internet down|not working|outage|cannot connect|no connection)/i.test(normalized)) {
    return { text: 'Please check the router and ONT cable connections, restart the router and wait two minutes, check the ONT indicator lights, and test another device if possible. If the issue continues, please file a technical ticket.', suggestions: ['File technical ticket', 'Contact support', 'Check outage status'], action: '/subscriber/my-tickets' };
  }

  if (/(slow|speed|lag|buffering|unstable|intermittent)/i.test(normalized)) {
    return { text: `Try restarting the router, disconnecting unused devices, testing with an Ethernet cable, and running a speed test. Compare the result with your current ${context.currentPlan || 'internet'} plan. If the problem continues, file a technical ticket.`, suggestions: ['File technical ticket', 'Router restart guide', 'Check outage status'], action: '/subscriber/my-tickets' };
  }

  if (/(plan|upgrade|downgrade|switch package|internet package)/i.test(normalized)) {
    return { text: `Available plans are Fiber 25 Mbps at ₱599/month, Fiber 50 Mbps at ₱799/month, and Fiber 100 Mbps at ₱999/month. Your current plan is ${context.currentPlan || 'not available'}.`, suggestions: ['Request plan upgrade', 'Request plan downgrade', 'File plan change ticket'], action: '/subscriber/my-tickets' };
  }

  if (/(ticket|file a ticket|report issue|complaint|concern|service request|request)/i.test(normalized)) {
    return { text: 'A support ticket gives your concern a tracked resolution process. Target response times are Urgent: 1–2 hours, High: 4 hours, Medium: 24 hours, and Low: 2 business days.', suggestions: ['File a ticket now', 'Check ticket status'], action: '/subscriber/my-tickets' };
  }

  return { text: 'I can help with billing and payments, installation schedules, slow or unavailable internet, internet plans, and support tickets.', suggestions: ['Check my bill', 'My installation schedule', 'Slow internet', 'File a ticket'] };
}
