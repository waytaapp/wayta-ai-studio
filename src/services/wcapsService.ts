import { db, doc, updateDoc, collection, addDoc, serverTimestamp, getDoc, getDocs, onSnapshot, query, where, orderBy, fsRunTransaction } from '../lib/firebase';
import { WCapTransaction, WCapReward, WCapConfig, User } from '../types';

export const wcapsService = {
  async getUserWcaps(uid: string): Promise<number> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().wcaps_balance || 0;
    }
    return 0;
  },

  listenUserWcaps(uid: string, callback: (balance: number) => void) {
    return onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        callback(doc.data().wcaps_balance || 0);
      } else {
        callback(0);
      }
    });
  },

  listenWcapsTransactions(uid: string, callback: (transactions: WCapTransaction[]) => void) {
    const q = query(
      collection(db, 'users', uid, 'wcaps_transactions'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WCapTransaction[];
      callback(transactions);
    });
  },

  async awardWcaps(uid: string, amount: number, source: { id: string; name: string; type: string }, description: string) {
    if (amount <= 0) return;

    await fsRunTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      
      let currentBalance = 0;
      if (userSnap.exists()) {
        currentBalance = userSnap.data().wcaps_balance || 0;
      }
      
      const newBalance = currentBalance + amount;
      
      // Update balance
      transaction.update(userRef, { wcaps_balance: newBalance });
      
      // Add transaction
      const transRef = doc(collection(db, 'users', uid, 'wcaps_transactions'));
      transaction.set(transRef, {
        timestamp: new Date().toISOString(),
        amount,
        type: 'earn',
        sourceId: source.id,
        sourceName: source.name,
        description
      });
    });
  },

  async redeemReward(uid: string, reward: WCapReward, source: { id: string; name: string }) {
    await fsRunTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      
      if (!userSnap.exists()) throw new Error('User not found');
      
      const currentBalance = userSnap.data().wcaps_balance || 0;
      if (currentBalance < reward.cost) {
        throw new Error('Insufficient W-Caps balance');
      }

      // Check stock
      const sourceRef = doc(db, reward.category === 'event' ? 'events' : 'venues', source.id);
      const sourceSnap = await transaction.get(sourceRef);
      if (!sourceSnap.exists()) throw new Error('Source not found');
      
      const rewards = sourceSnap.data().wcaps_rewards as WCapReward[] || [];
      const rewardIndex = rewards.findIndex(r => r.id === reward.id);
      
      if (rewardIndex === -1) throw new Error('Reward not found');
      if (rewards[rewardIndex].claimedCount >= rewards[rewardIndex].inventoryCap) {
        throw new Error('Reward fully claimed');
      }

      // Update claim count
      rewards[rewardIndex].claimedCount = (rewards[rewardIndex].claimedCount || 0) + 1;
      transaction.update(sourceRef, { wcaps_rewards: rewards });
      
      // Update balance
      transaction.update(userRef, { wcaps_balance: currentBalance - reward.cost });
      
      // Add transaction record
      const transRef = doc(collection(db, 'users', uid, 'wcaps_transactions'));
      transaction.set(transRef, {
        timestamp: new Date().toISOString(),
        amount: reward.cost,
        type: 'redeem',
        sourceId: source.id,
        sourceName: source.name,
        description: `Redeemed: ${reward.name}`
      });
    });
  },

  async updateConfig(sourceId: string, sourceType: 'venue' | 'event', config: WCapConfig) {
    const ref = doc(db, sourceType === 'event' ? 'events' : 'venues', sourceId);
    await updateDoc(ref, { wcaps_config: config });
  },

  async updateRewards(sourceId: string, sourceType: 'venue' | 'event', rewards: WCapReward[]) {
    const ref = doc(db, sourceType === 'event' ? 'events' : 'venues', sourceId);
    await updateDoc(ref, { wcaps_rewards: rewards });
  },

  async recordOrder(uid: string, amount: number, source: { id: string; name: string; type: 'venue' | 'event' }, userBudget: number) {
    const q = query(collection(db, 'users', uid, 'wcaps_transactions'));
    const snapshot = await getDocs(q);
    const isFirstOrder = snapshot.empty;

    let earnAmount = 0;
    let description = '';

    const sourceDoc = await getDoc(doc(db, source.type === 'event' ? 'events' : 'venues', source.id));
    const config = sourceDoc.exists() ? (sourceDoc.data().wcaps_config as WCapConfig) : null;
    
    if (isFirstOrder) {
      // Proportional to budget (e.g. 10% of budget tier or similar)
      // Here: 1 point per currency unit of budget limit
      earnAmount = Math.floor(userBudget * 0.1) || 50; 
      description = `Initial W-Caps Activation (Budget: ${userBudget})`;
    } else {
      const rate = config?.isEnabled ? config.earnRate : 1;
      const boost = (config?.isEnabled && config.boostMultiplier && this.isBoostActive(config)) ? config.boostMultiplier : 1;
      earnAmount = Math.floor(amount * rate * boost);
      description = `Earned from ${source.name} order${boost > 1 ? ` (${boost}x Boost!)` : ''}`;
    }

    if (earnAmount > 0) {
      await this.awardWcaps(uid, earnAmount, source, description);
    }
    return earnAmount;
  },

  isBoostActive(config: WCapConfig): boolean {
    return !!config.boostActive;
  },

  calculateEstimatedEarnings(amount: number, userBudget: number, config: WCapConfig | undefined, hasPreviousOrders: boolean): number {
    if (!hasPreviousOrders) {
      return Math.floor(userBudget * 0.1) || 50;
    }
    const rate = config?.isEnabled ? config.earnRate : 1;
    const boost = (config?.isEnabled && config.boostMultiplier && this.isBoostActive(config)) ? config.boostMultiplier : 1;
    return Math.floor(amount * rate * boost);
  },
};
