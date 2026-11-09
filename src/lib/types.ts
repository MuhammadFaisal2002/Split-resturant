export type WalletType = "jazzcash" | "easypaisa" | "sadapay" | "nayapay" | "other";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  raast_id: string | null;
  iban: string | null;
  wallet_number: string | null;
  wallet_type: WalletType | null;
  notify_email: boolean;
  created_at: string;
};

export type Group = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  display_name: string;
  position: number;
};

export type SplitType = "equal" | "custom";
export type SplitStatus = "open" | "settled" | "closed";
export type ShareStatus = "unpaid" | "pending" | "confirmed" | "rejected" | "waived";

export type Split = {
  id: string;
  owner_user_id: string;
  title: string;
  total_amount: number;
  split_type: SplitType;
  include_self: boolean;
  status: SplitStatus;
  short_code: string;
  split_date: string;
  note: string | null;
  created_at: string;
  settled_at: string | null;
  closed_at: string | null;
};

export type SplitShare = {
  id: string;
  split_id: string;
  display_name: string;
  amount: number;
  is_owner: boolean;
  position: number;
  status: ShareStatus;
  claimed_token: string | null;
  screenshot_path: string | null;
  note: string | null;
  reject_reason: string | null;
  marked_paid_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type SplitWithShares = Split & { shares: SplitShare[] };

export type PaymentDetails = Pick<
  Profile,
  "name" | "raast_id" | "iban" | "wallet_number" | "wallet_type"
>;

export type EventName =
  | "split_created"
  | "link_opened"
  | "name_claimed"
  | "marked_paid"
  | "confirmed"
  | "rejected"
  | "split_settled"
  | "split_closed"
  | "reminder_sent";
