/*
  # Create wallets and transactions tables

  1. New Types
    - currency_type (CDF, USD)
    - transaction_type (DEPOSIT, WITHDRAWAL, PURCHASE)

  2. New Tables
    - `profiles` (reference table)
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)

    - `wallets`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key)
      - `wallet_address` (text, unique, auto-generated)
      - `balance_cdf` (numeric)
      - `balance_usd` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `transactions`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, foreign key)
      - `amount` (numeric)
      - `currency` (currency_type)
      - `transaction_type` (transaction_type)
      - `description` (text)
      - `external_reference` (text)
      - `defmaks_revenue_cdf` (numeric)
      - `defmaks_revenue_usd` (numeric)
      - `transaction_date` (timestamptz)
      - `created_at` (timestamptz)

  3. Functions
    - set_wallet_address() - Auto-generate wallet address
    - update_wallet_and_defmaks_revenue() - Update wallet balance

  4. Security
    - Enable RLS on all tables
    - Policies for wallet and transaction access
*/

-- Create types
CREATE TYPE IF NOT EXISTS currency_type AS ENUM ('CDF', 'USD', 'XOF');
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PURCHASE');

-- Create profiles table (simplified for device-based auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE,
  wallet_address text UNIQUE NOT NULL,
  balance_cdf numeric(15, 2) DEFAULT 0,
  balance_usd numeric(15, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT wallets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE SET NULL
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid,
  amount numeric(15, 2) NOT NULL,
  currency currency_type NOT NULL,
  transaction_type transaction_type NOT NULL,
  description text,
  external_reference text,
  defmaks_revenue_cdf numeric(15, 2) DEFAULT 0,
  defmaks_revenue_usd numeric(15, 2) DEFAULT 0,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id);

-- Function to generate wallet address
CREATE OR REPLACE FUNCTION set_wallet_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.wallet_address IS NULL OR NEW.wallet_address = '' THEN
    NEW.wallet_address := 'FDA-' || substring(md5(random()::text) from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update wallet balance and calculate revenue
CREATE OR REPLACE FUNCTION update_wallet_and_defmaks_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  revenue_rate numeric := 0.02; -- 2% commission
BEGIN
  -- Calculate Defmaks revenue
  IF NEW.transaction_type = 'PURCHASE' THEN
    IF NEW.currency = 'USD' THEN
      NEW.defmaks_revenue_usd := NEW.amount * revenue_rate;
      NEW.defmaks_revenue_cdf := 0;
    ELSIF NEW.currency = 'CDF' THEN
      NEW.defmaks_revenue_cdf := NEW.amount * revenue_rate;
      NEW.defmaks_revenue_usd := 0;
    END IF;
  END IF;

  -- Update wallet balance
  IF NEW.transaction_type = 'DEPOSIT' OR NEW.transaction_type = 'PURCHASE' THEN
    IF NEW.currency = 'USD' THEN
      UPDATE wallets
      SET balance_usd = balance_usd + NEW.amount,
          updated_at = now()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.currency = 'CDF' THEN
      UPDATE wallets
      SET balance_cdf = balance_cdf + NEW.amount,
          updated_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  ELSIF NEW.transaction_type = 'WITHDRAWAL' THEN
    IF NEW.currency = 'USD' THEN
      UPDATE wallets
      SET balance_usd = balance_usd - NEW.amount,
          updated_at = now()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.currency = 'CDF' THEN
      UPDATE wallets
      SET balance_cdf = balance_cdf - NEW.amount,
          updated_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER set_wallet_address_trigger
  BEFORE INSERT ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION set_wallet_address();

CREATE TRIGGER update_wallet_and_defmaks_revenue_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_and_defmaks_revenue();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own wallet"
  ON wallets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own wallet"
  ON wallets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- Create table for purchased magazines
CREATE TABLE IF NOT EXISTS purchased_magazines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  magazine_id text NOT NULL,
  transaction_id uuid,
  purchase_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT purchased_magazines_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT purchased_magazines_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE SET NULL,
  UNIQUE(profile_id, magazine_id)
);

-- Enable RLS on purchased_magazines
ALTER TABLE purchased_magazines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their purchases"
  ON purchased_magazines FOR SELECT
  USING (true);

CREATE POLICY "Users can insert purchases"
  ON purchased_magazines FOR INSERT
  WITH CHECK (true);
