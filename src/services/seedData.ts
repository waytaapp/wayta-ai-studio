import { emailTemplateService } from './emailTemplateService';

export const seedEmailTemplates = async () => {
  const templates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to Wayta! Your first drink is on us.',
      body: 'Hi {{name}},\n\nWelcome to Wayta, the pulse of Sandton! We’re thrilled to have you onboard. To kick things off, enjoy a complimentary drink at any of our partner venues. Just show this email to the bartender.\n\nCheers to some unforgettable nights!\n\nThe Wayta Team',
      description: 'Sent to new users after registration.'
    },
    {
      name: 'Abandoned Cart',
      subject: 'Still thirsty? Your order is waiting! 🍸',
      body: 'Hi {{name}},\n\nYou left some items in your cart at {{venueName}}. They’re still cold and ready for you! Complete your order now and avoid the queue.\n\n[Link to Cart]',
      description: 'Sent after a user leaves items in their cart for more than 15 minutes.'
    },
    {
      name: 'Reactivation Email',
      subject: 'We miss you at the bar! 🍻',
      body: 'Hi {{name}},\n\nIt’s been a while since we saw you out! Sandton has missed your energy. Here is a special 20% discount on your next round to welcome you back.\n\nSee you on the dance floor!',
      description: 'Sent to users who haven’t checked in for over 30 days.'
    },
    {
      name: 'Order Ready',
      subject: 'Your drinks are ready at {{venueName}}! 🍹',
      body: 'Hi {{name}},\n\nGood news! Your order #{{orderId}} is ready for collection. Head over to the Wayta collection point at {{venueName}} with your QR code.\n\nEnjoy!',
      description: 'Sent when a bartender marks an order as ready.'
    },
    {
      name: 'Verification Success',
      subject: 'You’re Verified! Ready to Pulse? ✅',
      body: 'Hi {{name}},\n\nYour account verification was successful. You now have full access to all Wayta features, including fast-track orders and loyalty rewards.\n\nGet started by exploring venues near you!',
      description: 'Sent after a user successfully verifies their account.'
    }
  ];

  for (const t of templates) {
    try {
      const existing = await emailTemplateService.getTemplateByName(t.name);
      if (!existing) {
        await emailTemplateService.createTemplate(t);
        console.log(`Seeded template: ${t.name}`);
      }
    } catch (err: any) {
      if (err instanceof Error && err.message.includes('PERMISSION_DENIED')) {
        console.warn(`Skipped seeding template ${t.name} due to missing database permissions.`);
        break; // Stop attempting to seed further if permission is denied
      } else {
         console.warn(`Failed to seed template ${t.name}:`, err);
      }
    }
  }
};
