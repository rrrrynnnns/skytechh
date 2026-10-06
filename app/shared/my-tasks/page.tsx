import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function SharedHelpRoute() {
  const session = await auth();
  const role = session?.user?.role;
  redirect(role === 'subscriber' ? '/subscriber/help' : role === 'technician' ? '/technician/my-tasks' : '/admin/notifications');
}
