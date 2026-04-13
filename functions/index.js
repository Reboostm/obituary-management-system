const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();
const db = admin.firestore();

// Default bad words/spam indicators
const DEFAULT_BAD_WORDS = [
  'spam', 'scam', 'hack', 'viagra', 'casino', 'lottery',
  'congratulations you won', 'click here', 'limited time', 'act now',
  'free money', 'make money fast', 'work from home', 'get rich',
];

// Check if memory content is suspicious
function isSuspiciousContent(text, customBadWords = '') {
  const lowerText = text.toLowerCase();

  // Combine default and custom bad words
  const badWords = [
    ...DEFAULT_BAD_WORDS,
    ...(customBadWords ? customBadWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w) : []),
  ];

  // Check for profanity/spam keywords
  const hasBadWords = badWords.some(word => lowerText.includes(word));

  // Check for excessive caps or symbols
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  const symbolRatio = (text.match(/[!@#$%^&*]{2,}/g) || []).length;
  const hasExcessiveCaps = capsRatio > 0.5;
  const hasExcessiveSymbols = symbolRatio > 3;

  // Check for suspicious URLs
  const hasMultipleUrls = (text.match(/https?:\/\//g) || []).length > 1;

  // Check length (very short or very long memories might be spam)
  const isSuspiciousLength = text.length < 10 || text.length > 10000;

  return hasBadWords || hasExcessiveCaps || hasExcessiveSymbols || hasMultipleUrls;
}

// Cloud Function triggered when a memory is created
exports.checkMemoryForSpam = functions.firestore
  .document('memories/{memoryId}')
  .onCreate(async (snap, context) => {
    const memory = snap.data();
    const memoryId = context.params.memoryId;

    try {
      // Get notification settings
      const settingsRef = db.collection('systemSettings').doc('notifications');
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists) {
        console.log('No notification settings found');
        return;
      }

      const settings = settingsSnap.data();

      // Check if notifications are enabled
      if (!settings.notificationsEnabled) {
        console.log('Notifications disabled');
        return;
      }

      // Check if content is suspicious
      const isSuspicious = isSuspiciousContent(memory.memoryText || '', settings.customBadWords || '');

      if (!isSuspicious) {
        console.log('Memory passed content check');
        return;
      }

      // Send email alert to director(s)
      const resend = new Resend(settings.resendApiKey);
      const emailList = settings.directorEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

      if (emailList.length === 0) {
        console.log('No director emails configured');
        return;
      }

      // Get obituary name for context
      const obituaryRef = db.collection('obituaries').doc(memory.obituaryId);
      const obituarySnap = await obituaryRef.get();
      const obituaryName = obituarySnap.exists ? obituarySnap.data().fullName : 'Unknown';

      // Create email content
      const emailHtml = `
        <h2>⚠️ Suspicious Memory Posted</h2>
        <p>A potentially problematic memory has been posted on the memory wall:</p>

        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Obituary:</strong> ${obituaryName}</p>
          <p><strong>Posted by:</strong> ${memory.name} (${memory.relationship})</p>
          <p><strong>Content:</strong></p>
          <p style="white-space: pre-wrap; word-break: break-word;">${memory.memoryText || 'N/A'}</p>
        </div>

        <p><strong>Reason flagged:</strong> Contains suspicious keywords or patterns</p>

        <p style="margin-top: 20px;">
          <a href="https://your-dashboard-url.com/dashboard" style="background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Dashboard
          </a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          You can delete or hide this memory from the memory wall management section.
        </p>
      `;

      // Send email to all directors
      await resend.emails.send({
        from: 'noreply@resend.dev',
        to: emailList,
        subject: `⚠️ Suspicious Memory on ${obituaryName}`,
        html: emailHtml,
      });

      console.log(`Spam alert sent to ${emailList.join(', ')} for memory ${memoryId}`);

    } catch (error) {
      console.error('Error processing memory:', error);
      // Don't throw - we don't want to fail the memory creation if email fails
    }
  });

// Optional: Test function to send a test email
exports.sendTestEmail = functions.https.onRequest(async (req, res) => {
  try {
    const settingsSnap = await db.collection('systemSettings').doc('notifications').get();

    if (!settingsSnap.exists) {
      return res.status(400).json({ error: 'Settings not configured' });
    }

    const settings = settingsSnap.data();
    const resend = new Resend(settings.resendApiKey);

    const emailList = settings.directorEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e);

    const result = await resend.emails.send({
      from: 'noreply@resend.dev',
      to: emailList,
      subject: '✅ Test Email from Obituary System',
      html: '<h2>Test Email</h2><p>This is a test email. If you received this, notifications are working!</p>',
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
