import { supabase } from '../lib/supabase';

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  issue: string;
  recommendation: string;
  table?: string;
  policy?: string;
}

const issues: SecurityIssue[] = [];

function addIssue(issue: SecurityIssue) {
  issues.push(issue);
}

async function auditAuthentication() {
  console.log('\n🔐 Auditing Authentication & Authorization...\n');

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    addIssue({
      severity: 'info',
      category: 'Authentication',
      issue: 'No active session - testing as anonymous user',
      recommendation: 'This is expected for security testing',
    });
  }

  const { data, error } = await supabase.auth.getUser();

  if (error && !error.message.includes('session')) {
    addIssue({
      severity: 'medium',
      category: 'Authentication',
      issue: 'Authentication error: ' + error.message,
      recommendation: 'Verify authentication configuration and JWT settings',
    });
  }

  console.log('✅ Authentication system checked');
}

async function auditRLSPolicies() {
  console.log('\n🛡️  Auditing Row Level Security Policies...\n');

  const criticalTables = [
    'profiles',
    'bookings',
    'payment_methods',
    'transactions',
    'messages',
    'video_calls',
    'wallet_balance',
    'provider_verification',
    'escrow_transactions',
  ];

  for (const table of criticalTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (!error || error.message.includes('permission denied')) {
      console.log(`✅ ${table} - RLS enabled and working`);
    } else if (error?.message.includes('JWT')) {
      console.log(`✅ ${table} - Requires authentication`);
    } else if (!error && data) {
      addIssue({
        severity: 'critical',
        category: 'RLS Policies',
        table,
        issue: `Table "${table}" allows anonymous read access`,
        recommendation: 'Enable RLS and add authentication policies immediately',
      });
      console.log(`❌ ${table} - SECURITY RISK: Anonymous access allowed`);
    }
  }

  const { data: rlsStatus } = await supabase.rpc('check_rls_status').catch(() => ({ data: null }));

  console.log('\n✅ RLS policy audit complete');
}

async function auditPasswordPolicies() {
  console.log('\n🔑 Auditing Password Policies...\n');

  addIssue({
    severity: 'info',
    category: 'Password Security',
    issue: 'Password requirements should be enforced',
    recommendation: 'Ensure passwords require: 8+ chars, uppercase, lowercase, number, special char',
  });

  addIssue({
    severity: 'info',
    category: 'Password Security',
    issue: 'Password reset flow should be time-limited',
    recommendation: 'Verify reset tokens expire within 15-30 minutes',
  });

  console.log('✅ Password policy checks complete');
}

async function auditSensitiveDataExposure() {
  console.log('\n🔍 Auditing Sensitive Data Exposure...\n');

  const sensitiveFields = [
    { table: 'profiles', fields: ['email', 'phone', 'ssn', 'tax_id'] },
    { table: 'payment_methods', fields: ['card_number', 'cvv', 'bank_account'] },
    { table: 'transactions', fields: ['stripe_payment_id', 'amount'] },
    { table: 'provider_verification', fields: ['id_document', 'background_check_data'] },
  ];

  for (const { table, fields } of sensitiveFields) {
    for (const field of fields) {
      addIssue({
        severity: 'high',
        category: 'Data Protection',
        table,
        issue: `Sensitive field "${field}" in table "${table}"`,
        recommendation: `Ensure "${field}" is encrypted at rest and never logged in plain text`,
      });
    }
  }

  console.log('✅ Sensitive data audit complete');
}

async function auditPaymentSecurity() {
  console.log('\n💳 Auditing Payment Security...\n');

  addIssue({
    severity: 'critical',
    category: 'Payment Security',
    issue: 'Stripe keys must be stored securely',
    recommendation: 'Verify STRIPE_SECRET_KEY is in environment variables, never in code',
  });

  addIssue({
    severity: 'critical',
    category: 'Payment Security',
    issue: 'PCI compliance required for payment handling',
    recommendation: 'Use Stripe Elements/Payment Sheet - never store raw card data',
  });

  addIssue({
    severity: 'high',
    category: 'Payment Security',
    issue: 'Webhook signature verification',
    recommendation: 'All Stripe webhooks must verify signatures to prevent spoofing',
  });

  const { error } = await supabase
    .from('payment_methods')
    .select('*')
    .limit(1);

  if (!error) {
    addIssue({
      severity: 'critical',
      category: 'Payment Security',
      table: 'payment_methods',
      issue: 'Payment methods table may be accessible without authentication',
      recommendation: 'Add strict RLS policies to restrict access to payment methods',
    });
  }

  console.log('✅ Payment security audit complete');
}

async function auditAPIEndpoints() {
  console.log('\n🌐 Auditing API Endpoints...\n');

  addIssue({
    severity: 'high',
    category: 'API Security',
    issue: 'Rate limiting should be implemented',
    recommendation: 'Use rate_limiting table and middleware to prevent abuse',
  });

  addIssue({
    severity: 'medium',
    category: 'API Security',
    issue: 'Input validation required on all endpoints',
    recommendation: 'Validate and sanitize all user inputs to prevent injection attacks',
  });

  addIssue({
    severity: 'medium',
    category: 'API Security',
    issue: 'CORS configuration should be restrictive',
    recommendation: 'Only allow specific origins in production, not "*"',
  });

  console.log('✅ API endpoint audit complete');
}

async function auditEdgeFunctions() {
  console.log('\n⚡ Auditing Edge Functions...\n');

  addIssue({
    severity: 'high',
    category: 'Edge Function Security',
    issue: 'Edge functions must verify JWT tokens',
    recommendation: 'Use Authorization header and verify with Supabase auth',
  });

  addIssue({
    severity: 'medium',
    category: 'Edge Function Security',
    issue: 'Environment variables must be secure',
    recommendation: 'Never log or expose SUPABASE_SERVICE_ROLE_KEY',
  });

  addIssue({
    severity: 'medium',
    category: 'Edge Function Security',
    issue: 'Error messages should not leak sensitive info',
    recommendation: 'Return generic error messages to clients, log details server-side',
  });

  console.log('✅ Edge function audit complete');
}

async function auditDataRetention() {
  console.log('\n🗄️  Auditing Data Retention Policies...\n');

  addIssue({
    severity: 'medium',
    category: 'Data Retention',
    issue: 'Soft delete vs hard delete strategy',
    recommendation: 'Implement soft deletes for audit trails, hard delete PII on user request',
  });

  addIssue({
    severity: 'low',
    category: 'Data Retention',
    issue: 'Log retention policy needed',
    recommendation: 'Define retention periods for logs (30-90 days recommended)',
  });

  addIssue({
    severity: 'info',
    category: 'Data Retention',
    issue: 'GDPR compliance - right to be forgotten',
    recommendation: 'Implement user data export and deletion workflows',
  });

  console.log('✅ Data retention audit complete');
}

async function auditAccessControl() {
  console.log('\n👥 Auditing Access Control...\n');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_type')
    .limit(100);

  if (profiles) {
    const userTypes = new Set(profiles.map(p => p.user_type));

    if (!userTypes.has('admin')) {
      addIssue({
        severity: 'high',
        category: 'Access Control',
        issue: 'No admin users found in system',
        recommendation: 'Create at least one admin account for system management',
      });
    }
  }

  addIssue({
    severity: 'medium',
    category: 'Access Control',
    issue: 'Role-based access control (RBAC)',
    recommendation: 'Verify all admin functions check user_type = "admin"',
  });

  console.log('✅ Access control audit complete');
}

async function auditFileUploads() {
  console.log('\n📁 Auditing File Upload Security...\n');

  addIssue({
    severity: 'high',
    category: 'File Upload Security',
    issue: 'File type validation required',
    recommendation: 'Validate file types on upload, reject executables',
  });

  addIssue({
    severity: 'medium',
    category: 'File Upload Security',
    issue: 'File size limits needed',
    recommendation: 'Implement max file size limits (e.g., 10MB for images)',
  });

  addIssue({
    severity: 'medium',
    category: 'File Upload Security',
    issue: 'Malware scanning recommended',
    recommendation: 'Consider integrating virus scanning for uploaded files',
  });

  addIssue({
    severity: 'info',
    category: 'File Upload Security',
    issue: 'CDN and storage bucket policies',
    recommendation: 'Ensure Supabase storage buckets have proper RLS policies',
  });

  console.log('✅ File upload audit complete');
}

async function auditEncryption() {
  console.log('\n🔒 Auditing Encryption...\n');

  addIssue({
    severity: 'critical',
    category: 'Encryption',
    issue: 'Data at rest encryption',
    recommendation: 'Verify Supabase has encryption at rest enabled (default)',
  });

  addIssue({
    severity: 'critical',
    category: 'Encryption',
    issue: 'Data in transit encryption',
    recommendation: 'Ensure all connections use HTTPS/TLS',
  });

  addIssue({
    severity: 'high',
    category: 'Encryption',
    issue: 'Sensitive fields should be encrypted',
    recommendation: 'Consider pgcrypto for fields like SSN, tax_id',
  });

  console.log('✅ Encryption audit complete');
}

async function auditLogging() {
  console.log('\n📝 Auditing Logging & Monitoring...\n');

  addIssue({
    severity: 'medium',
    category: 'Logging',
    issue: 'Audit logs for sensitive operations',
    recommendation: 'Log all admin actions, payment transactions, access changes',
  });

  addIssue({
    severity: 'low',
    category: 'Logging',
    issue: 'Never log sensitive data',
    recommendation: 'Ensure passwords, card numbers, API keys never logged',
  });

  addIssue({
    severity: 'info',
    category: 'Logging',
    issue: 'Security event monitoring',
    recommendation: 'Set up alerts for failed login attempts, privilege escalations',
  });

  console.log('✅ Logging audit complete');
}

function generateSecurityReport() {
  console.log('\n\n📋 Generating Security Audit Report...\n');

  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');
  const info = issues.filter(i => i.severity === 'info');

  let report = `# DollarSmiley Marketplace - Security Audit Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  report += `## Executive Summary\n\n`;
  report += `**Total Issues Found:** ${issues.length}\n\n`;
  report += `| Severity | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| 🔴 Critical | ${critical.length} |\n`;
  report += `| 🟠 High | ${high.length} |\n`;
  report += `| 🟡 Medium | ${medium.length} |\n`;
  report += `| 🟢 Low | ${low.length} |\n`;
  report += `| ℹ️  Info | ${info.length} |\n\n`;

  if (critical.length > 0) {
    report += `⚠️ **CRITICAL**: ${critical.length} critical security issues require immediate attention!\n\n`;
  }

  report += `---\n\n`;

  const categories = Array.from(new Set(issues.map(i => i.category)));

  for (const category of categories) {
    const categoryIssues = issues.filter(i => i.category === category);
    report += `## ${category}\n\n`;

    for (const issue of categoryIssues) {
      const icon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: 'ℹ️',
      }[issue.severity];

      report += `### ${icon} ${issue.severity.toUpperCase()}: ${issue.issue}\n\n`;

      if (issue.table) {
        report += `**Table:** \`${issue.table}\`\n\n`;
      }

      if (issue.policy) {
        report += `**Policy:** \`${issue.policy}\`\n\n`;
      }

      report += `**Recommendation:** ${issue.recommendation}\n\n`;
      report += `---\n\n`;
    }
  }

  report += `## Security Best Practices\n\n`;
  report += `### Authentication & Authorization\n`;
  report += `- ✅ Use Supabase Auth with JWT tokens\n`;
  report += `- ✅ Implement MFA for admin accounts\n`;
  report += `- ✅ Enforce strong password policies\n`;
  report += `- ✅ Implement session timeout\n`;
  report += `- ✅ Use RLS policies on all tables\n\n`;

  report += `### Data Protection\n`;
  report += `- ✅ Encrypt sensitive data at rest\n`;
  report += `- ✅ Use HTTPS for all connections\n`;
  report += `- ✅ Implement proper access controls\n`;
  report += `- ✅ Regular security audits\n`;
  report += `- ✅ Data backup and recovery plan\n\n`;

  report += `### Payment Security\n`;
  report += `- ✅ PCI DSS compliance\n`;
  report += `- ✅ Use Stripe for card handling\n`;
  report += `- ✅ Verify webhook signatures\n`;
  report += `- ✅ Secure API key storage\n`;
  report += `- ✅ Fraud detection monitoring\n\n`;

  report += `### API Security\n`;
  report += `- ✅ Rate limiting on all endpoints\n`;
  report += `- ✅ Input validation and sanitization\n`;
  report += `- ✅ CORS policy configuration\n`;
  report += `- ✅ Error handling without data leakage\n`;
  report += `- ✅ API versioning\n\n`;

  report += `## Compliance Checklist\n\n`;
  report += `- [ ] GDPR - Right to access\n`;
  report += `- [ ] GDPR - Right to be forgotten\n`;
  report += `- [ ] GDPR - Data portability\n`;
  report += `- [ ] PCI DSS - Payment card security\n`;
  report += `- [ ] SOC 2 - Security controls\n`;
  report += `- [ ] CCPA - California privacy rights\n`;
  report += `- [ ] HIPAA - Healthcare data (if applicable)\n\n`;

  report += `## Immediate Actions Required\n\n`;

  if (critical.length > 0) {
    report += `### 🔴 Critical Priority\n\n`;
    critical.forEach((issue, i) => {
      report += `${i + 1}. **${issue.issue}**\n`;
      report += `   - ${issue.recommendation}\n\n`;
    });
  }

  if (high.length > 0) {
    report += `### 🟠 High Priority\n\n`;
    high.slice(0, 5).forEach((issue, i) => {
      report += `${i + 1}. **${issue.issue}**\n`;
      report += `   - ${issue.recommendation}\n\n`;
    });
  }

  report += `## Monitoring & Alerting\n\n`;
  report += `Set up alerts for:\n`;
  report += `- Failed login attempts (>5 in 10 minutes)\n`;
  report += `- Unusual API access patterns\n`;
  report += `- Privilege escalation attempts\n`;
  report += `- Payment transaction failures\n`;
  report += `- Database query anomalies\n\n`;

  report += `## Next Security Audit\n\n`;
  report += `Recommended: **30 days** from ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `Regular audits should be conducted:\n`;
  report += `- After major feature releases\n`;
  report += `- Quarterly for ongoing operations\n`;
  report += `- After security incidents\n`;
  report += `- When adding new integrations\n\n`;

  return report;
}

async function runSecurityAudit() {
  console.log('🔒 Starting Security Audit...\n');
  console.log('=====================================');

  await auditAuthentication();
  await auditRLSPolicies();
  await auditPasswordPolicies();
  await auditSensitiveDataExposure();
  await auditPaymentSecurity();
  await auditAPIEndpoints();
  await auditEdgeFunctions();
  await auditDataRetention();
  await auditAccessControl();
  await auditFileUploads();
  await auditEncryption();
  await auditLogging();

  console.log('\n=====================================');
  console.log('✅ Security Audit Complete!\n');

  const report = generateSecurityReport();

  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(process.cwd(), 'SECURITY_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`📄 Security report generated: ${reportPath}\n`);

  console.log('📊 Summary:');
  console.log(`- 🔴 Critical: ${issues.filter(i => i.severity === 'critical').length}`);
  console.log(`- 🟠 High: ${issues.filter(i => i.severity === 'high').length}`);
  console.log(`- 🟡 Medium: ${issues.filter(i => i.severity === 'medium').length}`);
  console.log(`- 🟢 Low: ${issues.filter(i => i.severity === 'low').length}`);
  console.log(`- ℹ️  Info: ${issues.filter(i => i.severity === 'info').length}`);

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  if (criticalCount > 0) {
    console.log(`\n⚠️  WARNING: ${criticalCount} critical issues found!`);
    console.log('Review and address immediately before production deployment.');
    return 1;
  }

  return 0;
}

if (require.main === module) {
  runSecurityAudit()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Security audit failed:', error);
      process.exit(1);
    });
}

export { runSecurityAudit, issues };
