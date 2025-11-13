// Subscription tier limits and validation

export type SubscriptionTier = 'basic' | 'pro' | 'xtream';

export interface SubscriptionLimits {
  buyBoxes: number; // -1 means unlimited
  zipsPerBuyBox: number; // -1 means unlimited
  users: number; // -1 means unlimited
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  basic: {
    buyBoxes: 5,
    zipsPerBuyBox: 5,
    users: 1,
  },
  pro: {
    buyBoxes: 20,
    zipsPerBuyBox: -1, // unlimited
    users: -1, // unlimited
  },
  xtream: {
    buyBoxes: -1, // unlimited
    zipsPerBuyBox: -1, // unlimited
    users: -1, // unlimited
  },
};

export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.basic;
}

export function canCreateBuyBox(
  currentBuyBoxCount: number,
  tier: SubscriptionTier
): boolean {
  const limits = getSubscriptionLimits(tier);
  if (limits.buyBoxes === -1) return true; // unlimited
  return currentBuyBoxCount < limits.buyBoxes;
}

export function canAddZipsToBuyBox(
  currentZipCount: number,
  newZipsCount: number,
  tier: SubscriptionTier
): boolean {
  const limits = getSubscriptionLimits(tier);
  if (limits.zipsPerBuyBox === -1) return true; // unlimited
  return (currentZipCount + newZipsCount) <= limits.zipsPerBuyBox;
}

export function canAddUser(
  currentUserCount: number,
  tier: SubscriptionTier
): boolean {
  const limits = getSubscriptionLimits(tier);
  if (limits.users === -1) return true; // unlimited
  return currentUserCount < limits.users;
}

export function getLimitMessage(
  type: 'buyBoxes' | 'zips' | 'users',
  tier: SubscriptionTier
): string {
  const limits = getSubscriptionLimits(tier);
  
  switch (type) {
    case 'buyBoxes':
      if (limits.buyBoxes === -1) return 'Unlimited buy boxes';
      return `Maximum ${limits.buyBoxes} buy boxes`;
    case 'zips':
      if (limits.zipsPerBuyBox === -1) return 'Unlimited zip codes per buy box';
      return `Maximum ${limits.zipsPerBuyBox} zip codes per buy box`;
    case 'users':
      if (limits.users === -1) return 'Unlimited team members';
      return `Maximum ${limits.users} team member${limits.users === 1 ? '' : 's'}`;
    default:
      return '';
  }
}

export function isAtLimit(
  current: number,
  limit: number
): boolean {
  if (limit === -1) return false; // unlimited
  return current >= limit;
}

export function getUpgradeMessage(tier: SubscriptionTier): string {
  switch (tier) {
    case 'basic':
      return 'Upgrade to Pro for 20 buy boxes, unlimited zips, and unlimited team members!';
    case 'pro':
      return 'Upgrade to Xtream for unlimited buy boxes and premium features!';
    case 'xtream':
      return 'You\'re on the best plan!';
    default:
      return 'Upgrade for more features!';
  }
}

