import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { OrderResponse } from '../../core/shop/shop.types';

@Injectable({ providedIn: 'root' })
export class OrderInvoiceService {
  generateInvoice(order: OrderResponse): jsPDF {
    const doc = new jsPDF();
    const total = order.items.reduce((sum, item) => sum + item.price, 0) + order.shippingCost;

    doc.setFontSize(18);
    doc.text('NEW GAME PLUS — Facture', 14, 18);

    doc.setFontSize(11);
    doc.text(`Commande : ${order.id}`, 14, 28);
    doc.text(`Date : ${new Date(order.createdAt).toLocaleDateString('fr-BE')}`, 14, 34);
    doc.text(`Boutique : ${order.shopName}`, 14, 42);
    doc.text(`Acheteur : ${order.buyerUsername} (${order.buyerEmail})`, 14, 48);

    autoTable(doc, {
      startY: 56,
      head: [['Article', 'Prix']],
      body: order.items.map((item) => [item.gameName, `${item.price.toFixed(2)} €`]),
    });

    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    if (order.deliveryMode === 'HOME' && order.shippingAddress) {
      const a = order.shippingAddress;
      doc.text(
        `Livraison à domicile : ${a.street} ${a.streetNumber}, ${a.postCode} ${a.city}, ${a.country}`,
        14,
        y,
      );
    } else if (order.deliveryMode === 'RELAY_POINT' && order.relayPoint) {
      const r = order.relayPoint;
      doc.text(
        `Point relais : ${r.relayName} — ${r.relayStreet}, ${r.relayPostCode} ${r.relayCity}, ${r.relayCountry}`,
        14,
        y,
      );
    }
    y += 8;
    doc.text(`Frais de livraison : ${order.shippingCost.toFixed(2)} €`, 14, y);

    y += 10;
    doc.setFontSize(13);
    doc.text(`Total : ${total.toFixed(2)} €`, 14, y);

    return doc;
  }
}
