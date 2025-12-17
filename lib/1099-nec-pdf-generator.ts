import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generate1099NECData, type Provider1099Summary } from './1099-nec-calculation';

// Business/Payer information - should come from settings
interface PayerInfo {
  name: string;
  ein: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

// Get payer information (should be fetched from database/settings)
async function getPayerInfo(): Promise<PayerInfo> {
  // TODO: Fetch from business settings in database
  return {
    name: 'Your Business Name',
    ein: 'XX-XXXXXXX',
    address: '123 Business Street',
    city: 'Business City',
    state: 'CA',
    zip: '12345',
    phone: '(555) 123-4567',
  };
}

// Generate HTML for 1099-NEC form
export function generate1099NECHTML(
  summary: Provider1099Summary,
  payer: PayerInfo,
  copyType: 'Copy B' | 'Copy C' | 'Copy 2'
): string {
  const taxYear = summary.tax_year;
  const recipientName = summary.business_name || summary.provider_name;
  const recipientTIN = summary.ein || `***-**-${summary.ssn_last_4}`;
  const amount = summary.nonemployee_compensation;

  // Copy descriptions
  const copyDescriptions = {
    'Copy B': 'For Recipient',
    'Copy C': 'For Payer',
    'Copy 2': 'To be filed with recipient\'s state income tax return',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Form 1099-NEC ${taxYear}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: 8.5in 11in;
      margin: 0.5in;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      line-height: 1.2;
      color: #000;
    }
    .form-1099 {
      width: 7.5in;
      height: 3.66in;
      border: 2px solid #000;
      padding: 0.1in;
      page-break-after: always;
      position: relative;
      background: white;
    }
    .form-header {
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .form-title {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 2px;
    }
    .form-year {
      font-size: 14pt;
      font-weight: bold;
      text-align: right;
    }
    .void-checkbox {
      border: 1px solid #000;
      padding: 2px 6px;
      display: inline-block;
      margin-left: 20px;
    }
    .corrected-checkbox {
      border: 1px solid #000;
      padding: 2px 6px;
      display: inline-block;
      margin-left: 10px;
    }
    .form-subtitle {
      font-size: 8pt;
      margin-top: 2px;
      font-weight: normal;
    }
    .form-copy {
      position: absolute;
      top: 0.15in;
      right: 0.15in;
      font-size: 12pt;
      font-weight: bold;
    }
    .form-body {
      display: grid;
      grid-template-columns: 3.5in 3.8in;
      gap: 0.1in;
      margin-top: 6px;
    }
    .left-column {
      border-right: 1px solid #000;
      padding-right: 0.05in;
    }
    .right-column {
      padding-left: 0.05in;
    }
    .box {
      border: 1px solid #000;
      padding: 3px;
      margin-bottom: 4px;
      min-height: 0.4in;
    }
    .box-label {
      font-size: 7pt;
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .box-content {
      font-size: 9pt;
      line-height: 1.3;
    }
    .box-large {
      min-height: 0.6in;
    }
    .box-amount {
      text-align: right;
      font-size: 11pt;
      font-weight: bold;
      padding-top: 8px;
    }
    .small-text {
      font-size: 7pt;
      line-height: 1.2;
    }
    .instruction-text {
      font-size: 6pt;
      margin-top: 8px;
      line-height: 1.3;
      border-top: 1px solid #ccc;
      padding-top: 4px;
    }
    .form-number {
      position: absolute;
      bottom: 0.1in;
      right: 0.1in;
      font-size: 7pt;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>

  <!-- Copy B: For Recipient -->
  <div class="form-1099">
    <div class="form-copy">Copy B<br><span style="font-size: 8pt;">For Recipient</span></div>

    <div class="form-header">
      <div>
        <span class="void-checkbox">☐ VOID</span>
        <span class="corrected-checkbox">☐ CORRECTED</span>
      </div>
      <div class="form-year">
        <div class="form-title">1099-NEC</div>
        <div class="form-subtitle" style="text-align: right;">${taxYear}</div>
      </div>
    </div>

    <div style="font-size: 8pt; font-weight: bold; margin-bottom: 6px;">
      Nonemployee Compensation
    </div>

    <div class="form-body">
      <!-- Left Column -->
      <div class="left-column">
        <!-- PAYER'S name, street address, city, state, ZIP code, and telephone no. -->
        <div class="box box-large">
          <span class="box-label">PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.</span>
          <div class="box-content">
            <strong>${payer.name}</strong><br>
            ${payer.address}<br>
            ${payer.city}, ${payer.state} ${payer.zip}<br>
            ${payer.phone || ''}
          </div>
        </div>

        <!-- PAYER'S TIN -->
        <div class="box">
          <span class="box-label">PAYER'S TIN</span>
          <div class="box-content"><strong>${payer.ein}</strong></div>
        </div>

        <!-- RECIPIENT'S TIN -->
        <div class="box">
          <span class="box-label">RECIPIENT'S TIN</span>
          <div class="box-content"><strong>${recipientTIN}</strong></div>
        </div>

        <!-- RECIPIENT'S name -->
        <div class="box box-large">
          <span class="box-label">RECIPIENT'S name</span>
          <div class="box-content">
            <strong>${recipientName}</strong>
          </div>
        </div>

        <!-- Street address -->
        <div class="box">
          <span class="box-label">Street address (including apt. no.)</span>
          <div class="box-content">
            ${summary.address_line_1}${summary.address_line_2 ? ' ' + summary.address_line_2 : ''}
          </div>
        </div>

        <!-- City, state, ZIP -->
        <div class="box">
          <span class="box-label">City or town, state or province, country, and ZIP or foreign postal code</span>
          <div class="box-content">
            ${summary.city}, ${summary.state} ${summary.zip_code}
          </div>
        </div>

        <!-- Account number -->
        <div class="box">
          <span class="box-label">Account number (see instructions)</span>
          <div class="box-content small-text">
            ${summary.provider_id.substring(0, 20)}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <!-- Box 1: Nonemployee compensation -->
        <div class="box" style="min-height: 0.8in;">
          <span class="box-label">1 Nonemployee compensation</span>
          <div class="box-amount">$${amount.toFixed(2)}</div>
        </div>

        <!-- Box 2: Payer made direct sales -->
        <div class="box">
          <span class="box-label">2 Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale</span>
          <div class="box-content">☐</div>
        </div>

        <!-- Box 4: Federal income tax withheld -->
        <div class="box">
          <span class="box-label">4 Federal income tax withheld</span>
          <div class="box-amount">$0.00</div>
        </div>

        <!-- Box 5: State tax withheld -->
        <div class="box">
          <span class="box-label">5 State tax withheld</span>
          <div class="box-amount"></div>
        </div>

        <!-- Box 6: State/Payer's state no. -->
        <div class="box">
          <span class="box-label">6 State/Payer's state no.</span>
          <div class="box-content"></div>
        </div>

        <!-- Box 7: State income -->
        <div class="box">
          <span class="box-label">7 State income</span>
          <div class="box-amount"></div>
        </div>
      </div>
    </div>

    <div class="instruction-text">
      <strong>Copy B. For Recipient.</strong> This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported. Report this amount on Schedule C (Form 1040), line 1; or Schedule F (Form 1040), line 9; or Schedule NEC (Form 1040-NR), line 1, whichever is applicable.
    </div>

    <div class="form-number">
      Form <strong>1099-NEC</strong> (Rev. January ${taxYear})
    </div>
  </div>

  <!-- Copy C: For Payer -->
  <div class="form-1099 page-break">
    <div class="form-copy">Copy C<br><span style="font-size: 8pt;">For Payer</span></div>

    <div class="form-header">
      <div>
        <span class="void-checkbox">☐ VOID</span>
        <span class="corrected-checkbox">☐ CORRECTED</span>
      </div>
      <div class="form-year">
        <div class="form-title">1099-NEC</div>
        <div class="form-subtitle" style="text-align: right;">${taxYear}</div>
      </div>
    </div>

    <div style="font-size: 8pt; font-weight: bold; margin-bottom: 6px;">
      Nonemployee Compensation
    </div>

    <div class="form-body">
      <!-- Left Column -->
      <div class="left-column">
        <div class="box box-large">
          <span class="box-label">PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.</span>
          <div class="box-content">
            <strong>${payer.name}</strong><br>
            ${payer.address}<br>
            ${payer.city}, ${payer.state} ${payer.zip}<br>
            ${payer.phone || ''}
          </div>
        </div>

        <div class="box">
          <span class="box-label">PAYER'S TIN</span>
          <div class="box-content"><strong>${payer.ein}</strong></div>
        </div>

        <div class="box">
          <span class="box-label">RECIPIENT'S TIN</span>
          <div class="box-content"><strong>${recipientTIN}</strong></div>
        </div>

        <div class="box box-large">
          <span class="box-label">RECIPIENT'S name</span>
          <div class="box-content">
            <strong>${recipientName}</strong>
          </div>
        </div>

        <div class="box">
          <span class="box-label">Street address (including apt. no.)</span>
          <div class="box-content">
            ${summary.address_line_1}${summary.address_line_2 ? ' ' + summary.address_line_2 : ''}
          </div>
        </div>

        <div class="box">
          <span class="box-label">City or town, state or province, country, and ZIP or foreign postal code</span>
          <div class="box-content">
            ${summary.city}, ${summary.state} ${summary.zip_code}
          </div>
        </div>

        <div class="box">
          <span class="box-label">Account number (see instructions)</span>
          <div class="box-content small-text">
            ${summary.provider_id.substring(0, 20)}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <div class="box" style="min-height: 0.8in;">
          <span class="box-label">1 Nonemployee compensation</span>
          <div class="box-amount">$${amount.toFixed(2)}</div>
        </div>

        <div class="box">
          <span class="box-label">2 Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale</span>
          <div class="box-content">☐</div>
        </div>

        <div class="box">
          <span class="box-label">4 Federal income tax withheld</span>
          <div class="box-amount">$0.00</div>
        </div>

        <div class="box">
          <span class="box-label">5 State tax withheld</span>
          <div class="box-amount"></div>
        </div>

        <div class="box">
          <span class="box-label">6 State/Payer's state no.</span>
          <div class="box-content"></div>
        </div>

        <div class="box">
          <span class="box-label">7 State income</span>
          <div class="box-amount"></div>
        </div>
      </div>
    </div>

    <div class="instruction-text">
      <strong>Copy C. For Payer.</strong> For Privacy Act and Paperwork Reduction Act Notice, see the current General Instructions for Certain Information Returns.
    </div>

    <div class="form-number">
      Form <strong>1099-NEC</strong> (Rev. January ${taxYear})
    </div>
  </div>

  <!-- Copy 2: For Recipient's State Tax Return -->
  <div class="form-1099 page-break">
    <div class="form-copy">Copy 2<br><span style="font-size: 7pt;">For Recipient</span></div>

    <div class="form-header">
      <div>
        <span class="void-checkbox">☐ VOID</span>
        <span class="corrected-checkbox">☐ CORRECTED</span>
      </div>
      <div class="form-year">
        <div class="form-title">1099-NEC</div>
        <div class="form-subtitle" style="text-align: right;">${taxYear}</div>
      </div>
    </div>

    <div style="font-size: 8pt; font-weight: bold; margin-bottom: 6px;">
      Nonemployee Compensation
    </div>

    <div class="form-body">
      <!-- Left Column -->
      <div class="left-column">
        <div class="box box-large">
          <span class="box-label">PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.</span>
          <div class="box-content">
            <strong>${payer.name}</strong><br>
            ${payer.address}<br>
            ${payer.city}, ${payer.state} ${payer.zip}<br>
            ${payer.phone || ''}
          </div>
        </div>

        <div class="box">
          <span class="box-label">PAYER'S TIN</span>
          <div class="box-content"><strong>${payer.ein}</strong></div>
        </div>

        <div class="box">
          <span class="box-label">RECIPIENT'S TIN</span>
          <div class="box-content"><strong>${recipientTIN}</strong></div>
        </div>

        <div class="box box-large">
          <span class="box-label">RECIPIENT'S name</span>
          <div class="box-content">
            <strong>${recipientName}</strong>
          </div>
        </div>

        <div class="box">
          <span class="box-label">Street address (including apt. no.)</span>
          <div class="box-content">
            ${summary.address_line_1}${summary.address_line_2 ? ' ' + summary.address_line_2 : ''}
          </div>
        </div>

        <div class="box">
          <span class="box-label">City or town, state or province, country, and ZIP or foreign postal code</span>
          <div class="box-content">
            ${summary.city}, ${summary.state} ${summary.zip_code}
          </div>
        </div>

        <div class="box">
          <span class="box-label">Account number (see instructions)</span>
          <div class="box-content small-text">
            ${summary.provider_id.substring(0, 20)}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <div class="box" style="min-height: 0.8in;">
          <span class="box-label">1 Nonemployee compensation</span>
          <div class="box-amount">$${amount.toFixed(2)}</div>
        </div>

        <div class="box">
          <span class="box-label">2 Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale</span>
          <div class="box-content">☐</div>
        </div>

        <div class="box">
          <span class="box-label">4 Federal income tax withheld</span>
          <div class="box-amount">$0.00</div>
        </div>

        <div class="box">
          <span class="box-label">5 State tax withheld</span>
          <div class="box-amount"></div>
        </div>

        <div class="box">
          <span class="box-label">6 State/Payer's state no.</span>
          <div class="box-content"></div>
        </div>

        <div class="box">
          <span class="box-label">7 State income</span>
          <div class="box-amount"></div>
        </div>
      </div>
    </div>

    <div class="instruction-text">
      <strong>Copy 2. To be filed with recipient's state income tax return, when required.</strong>
    </div>

    <div class="form-number">
      Form <strong>1099-NEC</strong> (Rev. January ${taxYear})
    </div>
  </div>

</body>
</html>
`;
}

// Generate and save 1099-NEC PDF
export async function generate1099PDF(
  summary: Provider1099Summary
): Promise<{ success: boolean; fileUri?: string; error?: string }> {
  try {
    if (!summary.is_ready_for_filing) {
      return {
        success: false,
        error: 'Provider is not ready for 1099 filing. Check W-9 status and threshold.',
      };
    }

    const payer = await getPayerInfo();
    const html = generate1099NECHTML(summary, payer, 'Copy B');

    const fileName = `1099_NEC_${summary.tax_year}_${summary.provider_id.substring(0, 8)}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, html);

    return {
      success: true,
      fileUri,
    };
  } catch (error: any) {
    console.error('Error generating 1099 PDF:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate 1099 PDF',
    };
  }
}

// Generate and share 1099-NEC
export async function generateAndShare1099(
  summary: Provider1099Summary
): Promise<void> {
  const result = await generate1099PDF(summary);

  if (!result.success || !result.fileUri) {
    throw new Error(result.error || 'Failed to generate 1099');
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.fileUri, {
      mimeType: 'text/html',
      dialogTitle: `1099-NEC ${summary.tax_year} - ${summary.provider_name}`,
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

// Generate bulk 1099s for all ready providers
export async function generateBulk1099s(
  providers: Provider1099Summary[]
): Promise<{
  success: boolean;
  generated: number;
  failed: number;
  errors: string[];
}> {
  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.is_ready_for_filing) {
      failed++;
      errors.push(`${provider.provider_name}: Not ready for filing`);
      continue;
    }

    const result = await generate1099PDF(provider);
    if (result.success) {
      generated++;
    } else {
      failed++;
      errors.push(`${provider.provider_name}: ${result.error}`);
    }
  }

  return {
    success: generated > 0,
    generated,
    failed,
    errors,
  };
}

// Format TIN for display
export function formatTIN(tin: string, type: 'EIN' | 'SSN'): string {
  if (type === 'EIN') {
    return tin.replace(/(\d{2})(\d{7})/, '$1-$2');
  }
  return tin.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
}

// Validate 1099 data before generation
export function validate1099ForGeneration(summary: Provider1099Summary): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!summary.is_ready_for_filing) {
    errors.push('Provider is not marked as ready for filing');
  }

  if (!summary.has_w9_on_file) {
    errors.push('No W-9 on file');
  }

  if (!summary.meets_threshold) {
    errors.push('Does not meet $600 threshold');
  }

  if (!summary.ein && !summary.ssn_last_4) {
    errors.push('Missing taxpayer identification number');
  }

  if (!summary.address_line_1) {
    errors.push('Missing street address');
  }

  if (!summary.city) {
    errors.push('Missing city');
  }

  if (!summary.state) {
    errors.push('Missing state');
  }

  if (!summary.zip_code) {
    errors.push('Missing ZIP code');
  }

  if (summary.nonemployee_compensation <= 0) {
    errors.push('Nonemployee compensation must be greater than $0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
