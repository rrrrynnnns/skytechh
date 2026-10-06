import { auth } from '@/auth';
export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin') || pathname === '/dashboard') if (request.auth?.user?.role !== 'admin') return Response.redirect(new URL('/login', request.nextUrl));
  if (pathname.startsWith('/technician') || pathname === '/my-tasks') if (request.auth?.user?.role !== 'technician') return Response.redirect(new URL('/login', request.nextUrl));
  if (pathname.startsWith('/subscriber') || pathname === '/my-account') if (request.auth?.user?.role !== 'subscriber') return Response.redirect(new URL('/login', request.nextUrl));
  if (pathname.startsWith('/shared')) {
    const role = request.auth?.user?.role;
    return Response.redirect(new URL(role === 'subscriber' ? '/subscriber/help' : role === 'technician' ? '/technician/my-tasks' : '/admin/notifications', request.nextUrl));
  }
});
export const config = { matcher: ['/admin/:path*', '/technician/:path*', '/subscriber/:path*', '/shared/:path*', '/dashboard', '/my-tasks', '/my-account'] };
