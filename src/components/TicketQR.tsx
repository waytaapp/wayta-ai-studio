import React from 'react';
import QRCode from 'react-qr-code';

interface TicketQRProps {
  ticketId: string;
  size?: number;
  className?: string;
}

export const TicketQR: React.FC<TicketQRProps> = ({ 
  ticketId, 
  size = 200, 
  className 
}) => {
  return (
    <div 
      id={`ticket-qr-wrapper-${ticketId}`} 
      className={`p-3 bg-white rounded-2xl shadow-sm ${className || ''}`}
    >
      <QRCode 
        id={`qr-code-${ticketId}`}
        value={`TICKET_ID:${ticketId}`}
        size={size}
        level="H"
        className="max-w-full h-auto mx-auto"
      />
    </div>
  );
};
