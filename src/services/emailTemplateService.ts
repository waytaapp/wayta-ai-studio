import { rtdb, handleRTDBError, OperationType, ref, get, set, push, update, rtdbTimestamp, rtdbQuery, orderByChild, equalTo } from '../lib/firebase';

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const emailTemplateService = {
  async getAllTemplates(): Promise<EmailTemplate[]> {
    const path = 'email_templates';
    try {
      const dbRef = ref(rtdb, path);
      const snapshot = await get(dbRef);
      if (!snapshot.exists()) return [];

      const templates: EmailTemplate[] = [];
      snapshot.forEach((child) => {
        templates.push({ id: child.key!, ...child.val() } as EmailTemplate);
      });
      return templates;
    } catch (error) {
      handleRTDBError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getTemplateByName(name: string): Promise<EmailTemplate | null> {
    const path = 'email_templates';
    try {
      const dbRef = ref(rtdb, path);
      const q = rtdbQuery(dbRef, orderByChild('name'), equalTo(name));
      const snapshot = await get(q);
      if (!snapshot.exists()) return null;
      
      let template: EmailTemplate | null = null;
      snapshot.forEach((child) => {
        template = { id: child.key!, ...child.val() } as EmailTemplate;
      });
      return template;
    } catch (error) {
      handleRTDBError(error, OperationType.GET, path);
      return null;
    }
  },

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const path = 'email_templates';
    try {
      const dbRef = ref(rtdb, path);
      const newDocRef = push(dbRef);
      await set(newDocRef, {
        ...template,
        createdAt: rtdbTimestamp(),
        updatedAt: rtdbTimestamp()
      });
      return newDocRef.key!;
    } catch (error) {
      handleRTDBError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async updateTemplate(id: string, template: Partial<Omit<EmailTemplate, 'id' | 'createdAt'>>): Promise<void> {
    const path = `email_templates/${id}`;
    try {
      const dbRef = ref(rtdb, path);
      await update(dbRef, {
        ...template,
        updatedAt: rtdbTimestamp()
      });
    } catch (error) {
      handleRTDBError(error, OperationType.UPDATE, path);
      throw error;
    }
  }
};
