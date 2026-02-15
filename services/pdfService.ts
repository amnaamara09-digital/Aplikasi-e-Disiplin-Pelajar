
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DisciplineRecord, SchoolInfo } from '../types';

const LOGO_URL = "https://i.ibb.co/99m6byNT/MTIJ-Logo-3.png";

/**
 * Helper untuk menukar YYYY-MM-DD kepada DD/MM/YYYY
 */
const formatDateMY = (dateStr: string): string => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Helper untuk mendapatkan tarikh hari ini dalam format DD/MM/YYYY
 */
const getTodayMY = (): string => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
};

/**
 * Helper untuk melukis blok tandatangan (Disediakan & Disahkan) - Digunakan untuk laporan selain surat
 */
const drawSignatureBlock = (doc: jsPDF, startY: number, isLandscape: boolean = false) => {
  const pageWidth = isLandscape ? 297 : 210;
  const margin = 20;
  
  if (startY > (isLandscape ? 170 : 250)) {
    doc.addPage();
    startY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  doc.text("Disediakan oleh:", margin, startY);
  doc.line(margin, startY + 15, margin + 60, startY + 15);
  doc.text("(Guru / Warden Bertugas)", margin, startY + 20);

  const rightX = isLandscape ? 180 : 130;
  doc.text("Disahkan oleh:", rightX, startY);
  doc.line(rightX, startY + 15, rightX + 60, startY + 15);
  doc.text("(Pentadbiran MTIJ)", rightX, startY + 20);
};

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

/**
 * Menjana Laporan Ringkasan (Jadual)
 */
export const generateTableReport = async (records: DisciplineRecord[], school: SchoolInfo, filterType: string) => {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  
  const now = new Date();
  const dateFormatted = getTodayMY();
  const timeFormatted = now.toLocaleTimeString('ms-MY', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
  }).replace(/am/g, 'PG').replace(/pm/g, 'PTG');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN DISIPLIN MURID (MTIJ)', 148.5, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const catLabel = filterType === 'daily' ? 'HARIAN' : filterType === 'weekly' ? 'MINGGUAN' : filterType === 'monthly' ? 'BULANAN' : 'KESELURUHAN';
  doc.text(`Kategori Laporan: ${catLabel}`, 148.5, 22, { align: 'center' });
  doc.text(`Dijana pada: ${dateFormatted}, ${timeFormatted}`, 148.5, 28, { align: 'center' });

  const tableData = records.map((rec, index) => [
    index + 1,
    formatDateMY(rec.date),
    rec.studentName,
    rec.studentClass,
    rec.category,
    rec.violationType,
    rec.demerit,
    rec.location,
    rec.actionTaken
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['No', 'Tarikh', 'Nama Murid', 'Kelas', 'Kategori', 'Salah Laku', 'Mata', 'Lokasi', 'Tindakan']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [37, 76, 186], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      valign: 'middle',
      textColor: [50, 50, 50],
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 55 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 35 },
      5: { cellWidth: 50 },
      6: { halign: 'center', cellWidth: 12 },
      7: { cellWidth: 25 },
      8: { cellWidth: 40 }
    },
    margin: { left: 10, right: 10, bottom: 40 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  drawSignatureBlock(doc, finalY, true);

  doc.save(`Ringkasan_Laporan_MTIJ_${catLabel}.pdf`);
};

/**
 * Menjana Ringkasan Kes untuk satu rekod (Single Page)
 */
export const generateSummary = async (record: DisciplineRecord, school: SchoolInfo, docInstance?: jsPDF) => {
  const doc = docInstance || new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const startY = docInstance ? 15 : 15;

  try {
    const logoBase64 = await getBase64ImageFromURL(LOGO_URL);
    doc.addImage(logoBase64, 'PNG', 15, startY, 20, 20);
  } catch (e) { console.error(e); }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN KES DISIPLIN', 40, startY + 7);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(school.name, 40, startY + 12);
  doc.text(`Tarikh Cetakan: ${getTodayMY()}`, 40, startY + 17);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, startY + 25, 195, startY + 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MAKLUMAT PELAJAR', 15, startY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama: ${record.studentName}`, 15, startY + 42);
  doc.text(`Kelas: ${record.studentClass}`, 15, startY + 47);
  doc.text(`ID Rekod: ${record.id}`, 15, startY + 52);

  doc.setFont('helvetica', 'bold');
  doc.text('BUTIRAN KESALAHAN', 110, startY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kategori: ${record.category}`, 110, startY + 42);
  doc.text(`Mata Demerit: ${record.demerit}`, 110, startY + 47);
  doc.text(`Tarikh: ${formatDateMY(record.date)}`, 110, startY + 52);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, startY + 60, 180, 45, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('JENIS KESALAHAN:', 20, startY + 70);
  doc.setFont('helvetica', 'normal');
  doc.text(record.violationType, 20, startY + 77, { maxWidth: 170 });
  
  doc.setFont('helvetica', 'bold');
  doc.text('TINDAKAN:', 20, startY + 87);
  doc.setFont('helvetica', 'normal');
  doc.text(record.actionTaken, 45, startY + 87);

  doc.setFont('helvetica', 'bold');
  doc.text('DILAPORKAN OLEH:', 20, startY + 93);
  doc.setFont('helvetica', 'normal');
  doc.text(record.reportedBy, 60, startY + 93);

  drawSignatureBlock(doc, startY + 115);

  if (!docInstance) {
    doc.save(`Ringkasan_${record.studentName.replace(/\s+/g, '_')}.pdf`);
  }
};

/**
 * Menjana PDF yang mengandungi ringkasan semua rekod
 */
export const generateAllSummaries = async (records: DisciplineRecord[], school: SchoolInfo) => {
  if (records.length === 0) return;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  for (let i = 0; i < records.length; i++) {
    if (i > 0) doc.addPage();
    await generateSummary(records[i], school, doc);
  }
  doc.save(`Ringkasan_Kes_Pukal.pdf`);
};

/**
 * Menjana Laporan Salah Laku Individu
 */
export const generateReport = async (record: DisciplineRecord, school: SchoolInfo) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const margin = 20;
  try {
    const logoBase64 = await getBase64ImageFromURL(LOGO_URL);
    doc.addImage(logoBase64, 'PNG', 90, 10, 30, 30);
  } catch (e) { console.error(e); }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(school.name.toUpperCase(), 105, 48, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(school.address, 105, 54, { align: 'center' });
  doc.text(`Tel: ${school.phone} | Email: ${school.email}`, 105, 59, { align: 'center' });
  doc.line(margin, 65, 190, 65);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN SALAH LAKU DISIPLIN INDIVIDU', 105, 75, { align: 'center' });

  const bodyData = [
    ['ID Rekod', record.id],
    ['Nama Murid', record.studentName],
    ['Kelas', record.studentClass],
    ['Tarikh', `${formatDateMY(record.date)} (${record.day})`],
    ['Jenis Kesalahan', record.violationType],
    ['Mata Demerit', record.demerit],
    ['Tindakan', record.actionTaken],
    ['Butiran', record.details || '-']
  ];

  autoTable(doc, {
    startY: 85,
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 9 },
    margin: { bottom: 40 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  drawSignatureBlock(doc, finalY);

  doc.save(`Laporan_${record.studentName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Menjana Surat Rasmi (Mengikut Struktur Imej)
 */
export const generateLetter = async (record: DisciplineRecord, school: SchoolInfo) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const margin = 20;
  
  try {
    const logoBase64 = await getBase64ImageFromURL(LOGO_URL);
    doc.addImage(logoBase64, 'PNG', 92.5, 10, 25, 25);
  } catch (e) { console.error(e); }

  // Header
  let currentY = 42;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(school.name.toUpperCase(), 105, currentY, { align: 'center' });
  
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(school.address, 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.text(`Telefon: ${school.phone} | Emel: ${school.email}`, 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, 190, currentY);

  // Rujukan & Tarikh
  currentY += 10;
  doc.setFontSize(11);
  const year = record.date.split('-')[0];
  // Buang perkataan 'REC' dan ambil bahagian rujukan sahaja
  const idRef = record.id.replace('REC', '').split('-').pop() || '001';
  doc.text(`Ruj. Kami : MTIJ/DISP/${year}/${idRef}`, margin, currentY);
  doc.text(`Tarikh : ${getTodayMY()}`, 150, currentY);

  // Kepada
  currentY += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('KEPADA:', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Ibu Bapa / Penjaga,', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(record.studentName.toUpperCase(), margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Kelas: ${record.studentClass}`, margin, currentY);

  // Kandungan
  currentY += 12;
  doc.text('Tuan/Puan,', margin, currentY);
  
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  const subject = 'PER: NOTIS SALAH LAKU DISIPLIN MURID';
  doc.text(subject, margin, currentY);
  doc.line(margin, currentY + 0.5, margin + doc.getTextWidth(subject), currentY + 0.5);

  currentY += 10;
  doc.setFont('helvetica', 'normal');
  const openingText = "Dengan segala hormatnya perkara di atas adalah dirujuk. Dimaklumkan bahawa anak/jagaan tuan/puan telah didapati melanggar peraturan disiplin maahad seperti butiran berikut:";
  const splitOpening = doc.splitTextToSize(openingText, 170);
  doc.text(splitOpening, margin, currentY);
  currentY += (splitOpening.length * 5) + 5;

  // Butiran dalam senarai bernombor
  const listItems = [
    { label: "1. Jenis Kesalahan", value: `: ${record.violationType}` },
    { label: "2. Kategori Kes", value: `: ${record.category}` },
    { label: "3. Tarikh & Masa", value: `: ${formatDateMY(record.date)} / ${record.time}` },
    { label: "4. Lokasi", value: `: ${record.location}` },
    { label: "5. Tindakan", value: `: ${record.actionTaken}` },
    { label: "6. Butiran", value: `: ${record.details || 'Tiada butiran tambahan'}` }
  ];

  listItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, margin + 5, currentY);
    doc.setFont('helvetica', 'normal');
    const splitValue = doc.splitTextToSize(item.value, 120);
    doc.text(splitValue, margin + 50, currentY);
    currentY += (splitValue.length * 6);
  });

  // Penutup
  currentY += 5;
  const closingText = "Kerjasama tuan/puan amatlah dihargai bagi memastikan sahsiah anak jagaan dapat diperbaiki di masa hadapan.";
  const splitClosing = doc.splitTextToSize(closingText, 170);
  doc.text(splitClosing, margin, currentY);
  
  currentY += 10;
  doc.text("Sekian, terima kasih.", margin, currentY);
  
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('"MEMBINA GENERASI AL-QURAN"', margin, currentY);
  currentY += 6;
  doc.text('"ADAB MENDAHULUI ILMU"', margin, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text("Yang benar,", margin, currentY);

  // Blok tandatangan surat amaran mengikut imej (Hanya untuk surat amaran)
  currentY += 25;
  doc.setFont('helvetica', 'normal');
  doc.text("...........................................................................", margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Pihak Pentadbiran Disiplin", margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(school.name, margin, currentY);

  doc.save(`Surat_Disiplin_${record.studentName.replace(/\s+/g, '_')}.pdf`);
};
