import { jsPDF } from 'jspdf';

function formatCurrency(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 'P 0.00';
  return `P ${n.toFixed(2)}`;
}

export function generateReceiptPDF(order) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = 215.9; // letter width in mm
  const margin = 10;
  const lineHeight = 5;
  let y = margin;

  // Helper to add a line
  const addLine = (text, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(text), margin, y);
    y += lineHeight;
  };

  const addLineTwoCol = (left, right, fontSize = 9, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(left), margin, y);
    doc.text(String(right), pageWidth - margin - 30, y, { align: 'right' });
    y += lineHeight;
  };

  // HEADER
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SIMPLE DOUGH', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('E-RECEIPT', margin, y);
  y += 6;

  // Separator line
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Order info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  addLineTwoCol(`Order #: ${String(order.id || '').slice(-8)}`, `Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`);
  addLine(`Time: ${new Date(order.createdAt || Date.now()).toLocaleTimeString()}`);
  y += 2;

  // Customer info
  if (order.phone) {
    addLine(`Phone: ${order.phone}`);
  }
  if (order.deliveryAddress) {
    addLine(`Address: ${order.deliveryAddress}`);
  }
  y += 2;

  // Separator
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Items table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const col1 = margin;
  const col2 = 120;
  const col3 = 160;
  const col4 = 200;

  doc.text('Item', col1, y);
  doc.text('Qty', col2, y);
  doc.text('Price', col3, y);
  doc.text('Total', col4, y);
  y += 5;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items list
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let subtotal = 0;

  const items = order.items || [];
  items.forEach((item) => {
    const name = item.product?.name || item.name || 'Item';
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.product?.price ?? item.price ?? 0);
    const itemTotal = Number(item.totalPrice ?? (qty * unitPrice));
    subtotal += itemTotal;

    // Use fixed positions to avoid text wrapping issues
    doc.text(name, col1, y);
    doc.text(String(qty), col2 - 5, y, { align: 'center' });
    doc.text(formatCurrency(unitPrice), col3 - 5, y, { align: 'right' });
    doc.text(formatCurrency(itemTotal), col4 - 5, y, { align: 'right' });
    y += lineHeight + 1;
  });

  y += 2;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Totals section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  addLineTwoCol('Subtotal:', formatCurrency(subtotal));

  // Delivery fee
  let deliveryFee = 0;
  if (order.deliveryMethod === 'delivery') {
    deliveryFee = Number(order.deliveryFee ?? 0);
    if (deliveryFee === 0 && order.total && order.total > subtotal) {
      deliveryFee = order.total - subtotal;
    }
  }

  if (deliveryFee > 0) {
    addLineTwoCol('Delivery Fee:', formatCurrency(deliveryFee));
  }

  // Final total
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const finalTotal = order.total ?? (subtotal + deliveryFee);
  addLineTwoCol('TOTAL:', formatCurrency(finalTotal));

  // Payment & Delivery
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addLine(`Payment Method: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}`);
  addLine(`Delivery: ${order.deliveryMethod ? order.deliveryMethod.toUpperCase() : 'PICKUP'}`);

  // Notes
  if (order.notes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    addLine('Notes:');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(order.notes, pageWidth - margin * 2);
    noteLines.forEach(line => addLine(line, 8));
  }

  // Footer
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Thank you for your order!', margin, y);
  y += 3;
  doc.text('Simple Dough © 2025', margin, y);

  // Save PDF
  const filename = `simple-dough-receipt-${String(order.id || '').slice(-8)}.pdf`;
  doc.save(filename);
}
