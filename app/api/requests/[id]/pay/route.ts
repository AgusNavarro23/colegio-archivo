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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Generar ID de transacción ficticio
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const updatedRequest = await db.request.update({
      where: { id: params.id },
      data: { status: 'PAID', transactionId },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Pay request error:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}
