import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// In-memory token cache for strict security hygiene
let cachedGmailToken: string | null = null;
let gmailUserEmail: string | null = null;

export interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
  };
}

export const gmailService = {
  /**
   * Sets/updates the cached Gmail token in-memory (e.g. if loaded via another flow)
   */
  setToken(token: string, email?: string) {
    cachedGmailToken = token;
    if (email) {
      gmailUserEmail = email;
    }
  },

  /**
   * Returns whether the user is authenticated with a active cached Gmail token
   */
  isAuthenticated(): boolean {
    return !!cachedGmailToken;
  },

  /**
   * Retrieves the cached token
   */
  getToken(): string | null {
    return cachedGmailToken;
  },

  /**
   * Retrieves user Email
   */
  getEmail(): string | null {
    return gmailUserEmail || auth.currentUser?.email || null;
  },

  /**
   * Logs out/clears Gmail tokens
   */
  disconnect() {
    cachedGmailToken = null;
    gmailUserEmail = null;
  },

  /**
   * Connect Gmail via standard PopUp login with Gmail scopes
   */
  async connectGmail(): Promise<{ token: string; email: string }> {
    try {
      const provider = new GoogleAuthProvider();
      // Add standard Gmail Scopes
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/gmail.modify');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Failed to retrieve OAuth Access Token from Google Sign-In.');
      }

      cachedGmailToken = token;
      gmailUserEmail = result.user.email;

      return {
        token,
        email: result.user.email || ''
      };
    } catch (err) {
      console.error('Failed to link Gmail account:', err);
      throw err;
    }
  },

  /**
   * Returns labels list from user's account
   */
  async listLabels(): Promise<string[]> {
    const token = cachedGmailToken;
    if (!token) throw new Error('Gmail not connected. Please login first.');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Gmail API failed with status ${res.status}`);
    }

    const data = await res.json();
    return (data.labels || []).map((l: any) => l.name);
  },

  /**
   * Fetches the latest messages list
   */
  async listMessages(maxResults = 10, q?: string): Promise<GmailMessage[]> {
    const token = cachedGmailToken;
    if (!token) throw new Error('Gmail not connected. Please login first.');

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    if (q) {
      url += `&q=${encodeURIComponent(q)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.disconnect();
      }
      throw new Error(`Gmail API error: ${res.statusText}`);
    }

    const data = await res.json();
    const rawMsgs = data.messages || [];

    // Fetch full detail for each message in parallel
    const fullMessages = await Promise.all(
      rawMsgs.map(async (m: { id: string }) => {
        try {
          return await this.getMessageDetails(m.id);
        } catch (err) {
          console.warn(`Could not fetch details for msg ${m.id}:`, err);
          return { id: m.id, threadId: m.id, snippet: 'Details unavailable' };
        }
      })
    );

    return fullMessages;
  },

  /**
   * Retrieves full details for a single message
   */
  async getMessageDetails(id: string): Promise<GmailMessage> {
    const token = cachedGmailToken;
    if (!token) throw new Error('Gmail not connected. Please login first.');

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve message ${id}`);
    }

    const data = await res.json();
    
    // Parse headers to extract Subject, From, To, Date
    const headers = data.payload?.headers || [];
    const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
    const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
    const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
    const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

    // Extract body if present
    let body = '';
    if (data.payload?.parts) {
      const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain') || data.payload.parts[0];
      if (textPart?.body?.data) {
        body = this.decodeBase64(textPart.body.data);
      }
    } else if (data.payload?.body?.data) {
      body = this.decodeBase64(data.payload.body.data);
    }

    return {
      id: data.id,
      threadId: data.threadId,
      subject,
      from,
      to,
      date,
      snippet: data.snippet || '',
      body: body || data.snippet || ''
    };
  },

  /**
   * Sends an email by constructing and base64url encoding an RFC 2822 package
   */
  async sendEmail(to: string, subject: string, bodyText: string): Promise<{ id: string; threadId: string }> {
    const token = cachedGmailToken;
    if (!token) throw new Error('Gmail not connected. Please login first.');

    // Construct valid RFC 2822 raw email string
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      bodyText
    ];
    const rawEmailString = emailParts.join('\n');

    // Safe base64url encoding
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmailString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gmail send failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Fetches the latest drafts list
   */
  async listDrafts(): Promise<GmailDraft[]> {
    const token = cachedGmailToken;
    if (!token) throw new Error('Gmail not connected. Please login first.');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Gmail Drafts API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.drafts || [];
  },

  /**
   * Decodes Base64 or Base64Url string securely
   */
  decodeBase64(str: string): string {
    let clean = str.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) {
      clean += '=';
    }
    try {
      return decodeURIComponent(escape(atob(clean)));
    } catch (e) {
      try {
        return atob(clean);
      } catch (err) {
        return 'Unable to render content payload';
      }
    }
  }
};
