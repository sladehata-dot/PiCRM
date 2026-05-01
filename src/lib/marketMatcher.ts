import { supabase } from './supabase';

export interface MarketOffer {
  id: string;
  retailer: string;
  state: string;
  plan_name: string;
  plan_type: 'flat' | 'TOU' | 'controlled';
  usage_rate_peak: number;
  usage_rate_offpeak: number;
  usage_rate_flat: number;
  supply_charge_daily: number;
  feed_in_tariff: number;
  source_url: string;
  fetched_at: string;
}

export interface MatchResult {
  pi_annual_cost: number;
  pi_rate_cents: number;
  top_3_offers: OfferScore[];
  recommendation: string;
  recommendation_type: 'pi_competitive' | 'export_maximiser' | 'switch';
  vpp_ready: boolean;
  vpp_status: string;
  avg_daily_kwh: number;
  annual_kwh: number;
}

export interface OfferScore {
  retailer: string;
  plan_name: string;
  plan_type: string;
  annual_cost: number;
  delta_vs_pi: number;
  feed_in_tariff: number;
  supply_charge_daily: number;
}

const PI_RATE = 0.26;

export async function fetchMarketOffers(state: string): Promise<MarketOffer[]> {
  const { data, error } = await supabase
    .from('market_offers')
    .select('*')
    .eq('state', state)
    .eq('is_active', true)
    .order('usage_rate_flat', { ascending: true });

  if (error || !data) return [];
  return data as MarketOffer[];
}

export interface EnergyProfile {
  avg_daily_kwh: number;
  tariff_type: 'flat' | 'TOU' | 'controlled';
  peak_kwh?: number;
  offpeak_kwh?: number;
  solar_capacity_kw?: number;
  battery_capacity_kwh?: number;
  current_soc_pct?: number;
  export_eligible?: boolean;
  state: string;
}

export function matchMarketOffers(profile: EnergyProfile, offers: MarketOffer[]): MatchResult {
  const {
    avg_daily_kwh,
    solar_capacity_kw = 0,
    battery_capacity_kwh = 0,
    current_soc_pct = 100,
    export_eligible = false,
    tariff_type,
    peak_kwh,
  } = profile;

  // Estimate net grid consumption after solar self-use
  const solar_offset = solar_capacity_kw > 0
    ? Math.min(0.5, (solar_capacity_kw * 4) / (avg_daily_kwh * 15) * 0.15)
    : 0;
  const net_daily_kwh = avg_daily_kwh * (1 - solar_offset);
  const annual_kwh = net_daily_kwh * 365;

  // Pi annual cost — no supply charge
  const pi_annual_cost = annual_kwh * PI_RATE;

  const peak_pct = (peak_kwh && avg_daily_kwh > 0) ? peak_kwh / avg_daily_kwh : 0.4;
  const offpeak_pct = 1 - peak_pct;

  const scored: OfferScore[] = offers.map(offer => {
    let cost = 0;
    const flat = offer.usage_rate_flat || 0;
    const peak = offer.usage_rate_peak || flat;
    const offpeak = offer.usage_rate_offpeak || flat * 0.5;
    const supply = offer.supply_charge_daily || 0;

    if (tariff_type === 'TOU' && peak > 0) {
      cost = annual_kwh * (peak_pct * peak + offpeak_pct * offpeak) + supply * 365;
    } else if (tariff_type === 'controlled') {
      cost = annual_kwh * offpeak + supply * 365;
    } else {
      cost = annual_kwh * flat + supply * 365;
    }

    // Export credit if eligible
    if (export_eligible && offer.feed_in_tariff > 0) {
      const daily_export = Math.max(
        0,
        solar_capacity_kw * 4 - avg_daily_kwh - battery_capacity_kwh * 0.9
      );
      cost -= daily_export * 365 * offer.feed_in_tariff;
    }

    return {
      retailer: offer.retailer,
      plan_name: offer.plan_name,
      plan_type: offer.plan_type,
      annual_cost: Math.max(0, cost),
      delta_vs_pi: Math.max(0, cost) - pi_annual_cost,
      feed_in_tariff: offer.feed_in_tariff,
      supply_charge_daily: offer.supply_charge_daily,
    };
  });

  scored.sort((a, b) => a.annual_cost - b.annual_cost);
  const top_3_offers = scored.slice(0, 3);

  // Recommendation
  const best = top_3_offers[0];
  let recommendation = 'Pi Competitive';
  let recommendation_type: MatchResult['recommendation_type'] = 'pi_competitive';

  if (best && best.annual_cost < pi_annual_cost) {
    if (export_eligible && best.feed_in_tariff >= 0.10) {
      recommendation = `Export Maximiser — ${best.retailer} FiT ${(best.feed_in_tariff * 100).toFixed(0)}¢/kWh`;
      recommendation_type = 'export_maximiser';
    } else {
      const saving = Math.round(pi_annual_cost - best.annual_cost);
      recommendation = `Switch to ${best.retailer} — save ~$${saving}/yr`;
      recommendation_type = 'switch';
    }
  }

  // VPP readiness
  const vpp_ready = battery_capacity_kwh > 0 && current_soc_pct <= 20 && solar_capacity_kw > 0;
  let vpp_status = 'No battery';
  if (battery_capacity_kwh > 0 && solar_capacity_kw > 0) {
    vpp_status = current_soc_pct <= 20
      ? 'Ready — full cycle available tonight'
      : `SOC too high (${current_soc_pct}%) — needs discharge`;
  } else if (battery_capacity_kwh > 0) {
    vpp_status = 'Battery present, no solar — grid charge only';
  }

  return {
    pi_annual_cost,
    pi_rate_cents: PI_RATE * 100,
    top_3_offers,
    recommendation,
    recommendation_type,
    vpp_ready,
    vpp_status,
    avg_daily_kwh: net_daily_kwh,
    annual_kwh,
  };
}
