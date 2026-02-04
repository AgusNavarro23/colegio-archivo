import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import MercadoPagoConfig, { Preference } from 'mercadopago';

// CONFIGURACIÓN DE MERCADOPAGO
// Pon tu ACCESS_TOKEN de prueba aquí o en variables de entorno (.env)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-TU-TOKEN-AQUI' });

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: '401' }, { status: 401 });

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    // Buscar la solicitud para saber el monto
    const requestItem = await db.request.findUnique({ where: { id } });
    if (!requestItem || !requestItem.amount) {
      return NextResponse.json({ error: 'Solicitud inválida o sin monto' }, { status: 400 });
    }

    // INTENTO DE CREAR PREFERENCIA REAL (Si hay token configurado)
    if (process.env.MP_ACCESS_TOKEN) {
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: requestItem.id,
              title: `Trámite Notarial - ${requestItem.title}`,
              quantity: 1,
              unit_price: requestItem.amount,
              currency_id: 'ARS',
            },
          ],
          // URLs a donde vuelve el usuario después de pagar
          back_urls: {
            success: `http://localhost:3000/client?status=success&payment_id=${id}`,
            failure: `http://localhost:3000/client?status=failure`,
            pending: `http://localhost:3000/client?status=pending`,
          },
          auto_return: 'approved',
        }
      });
      
      return NextResponse.json({ url: result.init_point });
    }

    // --- SIMULACIÓN (Si no tienes token de MP configurado aún) ---
    // Simulamos que MP procesó el pago instantáneamente
    const transactionId = `MP-${Date.now()}`;
    await db.request.update({
        where: { id },
        data: { status: 'PAID', transactionId }
    });
    
    // Devolvemos una URL especial que el frontend detectará para recargar
    return NextResponse.json({ url: 'SIMULATED_SUCCESS' });

  } catch (error) {
    console.error('Pay request error:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}