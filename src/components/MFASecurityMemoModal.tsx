import React, { useEffect, useState } from 'react';

interface MFASecurityMemoModalProps {
  onAcknowledge: () => void;
}

export const MFASecurityMemoModal: React.FC<MFASecurityMemoModalProps> = ({ onAcknowledge }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const isAck = localStorage.getItem('wayta_mfa_memo_ack');
    if (isAck !== '1') {
      setShouldRender(true);
    } else {
      // If already acknowledged, trigger the callback immediately or do not render
      onAcknowledge();
    }
  }, [onAcknowledge]);

  if (!shouldRender) {
    return null;
  }

  const handleAccept = () => {
    localStorage.setItem('wayta_mfa_memo_ack', '1');
    setShouldRender(false);
    onAcknowledge();
  };

  const memoText = `CREME DE LA CREME ENTERTAINMENT
INTERNAL SECURITY MEMORANDUM

TO: All Manager-Level Personnel
FROM: IT Security & Compliance Division
RE: Multi-Factor Authentication (MFA) Enforcement — Mandatory Compliance
CLASSIFICATION: INTERNAL USE ONLY

Effective immediately, all manager-level accounts on the Wayta platform are subject to mandatory Multi-Factor Authentication (MFA) as part of our enhanced security framework. This policy is non-negotiable and applies to all personnel with manager credentials, without exception.

WHY THIS MATTERS:
Our venues handle sensitive financial transactions, patron data, and operational information. Unauthorised access to manager accounts poses a significant risk to our business continuity, client trust, and regulatory compliance obligations.

YOUR RESPONSIBILITIES:
1. Never share your PIN or OTP with anyone — including colleagues, supervisors, or IT staff.
2. If you receive an OTP you did not request, report it immediately to security@cremeentertainment.com.
3. Do not attempt to bypass or disable MFA under any circumstances.
4. Ensure your registered phone number is always current — contact HR to update.

CONSEQUENCES OF NON-COMPLIANCE:
Failure to adhere to this policy may result in immediate account suspension and disciplinary action in accordance with the CREME DE LA CREME ENTERTAINMENT Code of Conduct.

This memorandum serves as official notice. Continued use of the Wayta platform constitutes acknowledgement of and agreement to these terms.

IT Security & Compliance Division
CREME DE LA CREME ENTERTAINMENT
Confidential — Do Not Distribute`;

  return (
    <div className="fixed inset-0 min-h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="w-full max-w-2xl bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-white tracking-tight leading-snug">Security Memo Pending</h3>
            <p className="text-xs text-gray-400 font-medium">Compliance acknowledgement required before terminal activation</p>
          </div>
        </div>

        {/* Scrollable verbatim memo area */}
        <div className="flex-1 overflow-y-auto mb-6 bg-[#1f2937]/40 p-6 rounded-2xl border border-gray-800 font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap select-text">
          {memoText}
        </div>

        {/* Acknowledge CTA Button */}
        <div className="pt-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#059669] text-white font-bold text-sm tracking-wide uppercase hover:bg-[#047857] active:bg-[#065f46] transition-all shadow-lg active:scale-[0.98] cursor-pointer text-center"
          >
            I Acknowledge and Accept
          </button>
        </div>
      </div>
    </div>
  );
};
export default MFASecurityMemoModal;
