import puppeteer, { type Browser } from 'puppeteer';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface DocumentData {
  title: string;
  type: string;
  content: Record<string, any>;
  medications?: Medication[];
  patient: {
    name: string;
    cpf?: string;
    birthDate?: Date;
    phone?: string;
  };
  clinic: {
    name: string;
    tradeName?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  professional?: {
    name: string;
    cro?: string;
    croState?: string;
    specialty?: string;
  };
  template: {
    name: string;
    content: string;
    headerHtml?: string;
    footerHtml?: string;
    paperSize?: string;
    orientation?: string;
  };
  signedAt?: Date;
  signerName?: string;
  createdAt: Date;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCPF(cpf?: string): string {
  if (!cpf) return '___.___.___-__';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function generateMedicationsHtml(medications: Medication[]): string {
  if (!medications || medications.length === 0) return '';

  return medications
    .map(
      (med, index) => `
    <div class="medication">
      <p class="medication-name">${index + 1}. ${med.name} - ${med.dosage}</p>
      <p class="medication-dosage">Tomar ${med.frequency} por ${med.duration}</p>
      ${med.instructions ? `<p class="medication-instructions">${med.instructions}</p>` : ''}
    </div>
  `
    )
    .join('');
}

function processTemplateVariables(template: string, data: DocumentData): string {
  const variables: Record<string, string> = {
    '{{patientName}}': data.patient.name,
    '{{patientCpf}}': formatCPF(data.patient.cpf),
    '{{currentDate}}': formatDate(data.createdAt),
    '{{professionalName}}': data.professional?.name || '_______________',
    '{{professionalCro}}': data.professional?.cro
      ? `${data.professional.cro}-${data.professional.croState || ''}`
      : '______',
    '{{clinicName}}': data.clinic.name,
    '{{clinicPhone}}': data.clinic.phone || '',
    '{{clinicEmail}}': data.clinic.email || '',
    '{{customContent}}': data.content.customContent || '',
    '{{medications}}': generateMedicationsHtml(data.medications || []),
  };

  let result = template;
  for (const [variable, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}

function generateHtmlDocument(data: DocumentData): string {
  const processedContent = processTemplateVariables(data.template.content, data);

  // Format clinic address
  const address = data.clinic.address;
  const clinicAddress = address
    ? `${address.street || ''}, ${address.number || ''} - ${address.neighborhood || ''}, ${address.city || ''}-${address.state || ''}`
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      padding: 20mm;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .header .clinic-info {
      font-size: 10pt;
      color: #555;
    }

    .document-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 30px 0;
      text-transform: uppercase;
    }

    .content {
      white-space: pre-wrap;
      margin-bottom: 30px;
    }

    .medication {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f9f9f9;
      border-left: 3px solid #333;
    }

    .medication-name {
      font-weight: bold;
      font-size: 12pt;
    }

    .medication-dosage {
      font-size: 11pt;
      margin-top: 5px;
    }

    .medication-instructions {
      font-size: 10pt;
      color: #555;
      margin-top: 3px;
      font-style: italic;
    }

    .signature-section {
      margin-top: 60px;
      text-align: center;
    }

    .signature-line {
      width: 250px;
      border-top: 1px solid #000;
      margin: 0 auto 5px;
      padding-top: 5px;
    }

    .signature-info {
      font-size: 10pt;
    }

    .footer {
      position: fixed;
      bottom: 20mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9pt;
      color: #777;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }

    .signed-stamp {
      margin-top: 20px;
      padding: 10px;
      border: 2px solid #28a745;
      color: #28a745;
      display: inline-block;
    }

    @media print {
      body {
        padding: 0;
      }
      .footer {
        position: fixed;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.clinic.tradeName || data.clinic.name}</h1>
    <div class="clinic-info">
      ${clinicAddress ? `<p>${clinicAddress}</p>` : ''}
      ${data.clinic.phone ? `<p>Tel: ${data.clinic.phone}</p>` : ''}
    </div>
  </div>

  <div class="document-title">${data.title}</div>

  <div class="content">${processedContent}</div>

  <div class="signature-section">
    ${
      data.signedAt
        ? `
      <div class="signed-stamp">
        ✓ Documento assinado digitalmente<br>
        ${formatDate(data.signedAt)}<br>
        ${data.signerName || ''}
      </div>
    `
        : `
      <div class="signature-line"></div>
      <p class="signature-info">${data.professional?.name || 'Profissional Responsável'}</p>
      ${data.professional?.cro ? `<p class="signature-info">CRO: ${data.professional.cro}-${data.professional.croState || ''}</p>` : ''}
    `
    }
  </div>

  <div class="footer">
    <p>Documento gerado em ${formatDate(data.createdAt)} - ${data.clinic.name}</p>
  </div>
</body>
</html>
  `;
}

export async function generateDocumentPdf(data: DocumentData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = generateHtmlDocument(data);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const paperSize = data.template.paperSize || 'A4';
    const isLandscape = data.template.orientation === 'LANDSCAPE';

    const pdfBuffer = await page.pdf({
      format: paperSize as 'A4' | 'Letter',
      landscape: isLandscape,
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '30mm',
        left: '20mm',
        right: '20mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Cleanup on process exit
process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close();
  }
});
