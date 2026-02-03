import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Verificar token
function verifyToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las solicitudes (para empleados y admins)
    const requests = await db.request.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Get all requests error:', error);
    return NextResponse.json({ error: 'Error al cargar solicitudes' }, { status: 500 });
  }
}