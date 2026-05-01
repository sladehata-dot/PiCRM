import React from 'react';
import { User, MapPin, Zap, Sun, Hash, Building2, Calendar, DollarSign } from 'lucide-react';
import { AustralianBillData, getBillingCycleDisplay, type BillingCycle as BillingCycleType } from '@/types/BillData';

interface CustomerProfileProps {
  bills: AustralianBillData[];
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ bills }) => {
  if (bills.length === 0) return null;

  // Get the most recent bill for customer info and pricing (most accurate as prices always go up)
  const latestBill = bills[0];
  
  // Determine if customer has solar based on any bill
  const hasSolar = bills.some(bill => bill.hasSolar);
  const solarSize = bills.find(bill => bill.solarSystemSize)?.solarSystemSize;
  
  // Get most common power phases
  const phases = latestBill.powerPhases;
  
  // Get most common tariff type
  const tariffCounts = bills.reduce((acc, bill) => {
    acc[bill.tariffType] = (acc[bill.tariffType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const primaryTariff = Object.entries(tariffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FIXED';

  // Get most common billing cycle
  const cycleCounts = bills.reduce((acc, bill) => {
    acc[bill.billingCycle] = (acc[bill.billingCycle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const primaryCycle = Object.entries(cycleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as BillingCycleType || 'MONTHLY';

  // Use most recent bill rates (most accurate as prices always go up)
  const currentFixedRate = latestBill.singleRateCentsKwh;
  const currentSupplyCharge = latestBill.dailySupplyChargeCents;
  const currentFeedInTariff = latestBill.feedInTariffCentsKwh;
  
  // TOU rates from most recent bill
  const currentPeakRate = latestBill.peakRateCentsKwh;
  const currentOffPeakRate = latestBill.offPeakRateCentsKwh;
  const currentShoulderRate = latestBill.shoulderRateCentsKwh;
  
  // Check if customer has controlled load
  const hasControlledLoad = latestBill.controlledLoadKwh > 0 || latestBill.controlledLoadRateCentsKwh > 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 px-6 py-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Customer Profile</h3>
        <p className="text-sm text-slate-400">Extracted from uploaded bills</p>
      </div>
      
      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Customer Details</h4>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Customer Name</p>
                <p className="text-white font-medium">{latestBill.customerName}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Service Address</p>
                <p className="text-white font-medium">{latestBill.serviceAddress}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">NMI (National Meter Identifier)</p>
                <p className="text-white font-medium font-mono">{latestBill.nmi}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Current Retailer</p>
                <p className="text-white font-medium">{latestBill.retailer}</p>
              </div>
            </div>
          </div>
          
          {/* System Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">System Details</h4>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Power Supply</p>
                <p className="text-white font-medium">
                  {phases === 1 ? 'Single Phase' : phases === 2 ? 'Two Phase' : 'Three Phase'}
                </p>
                <p className="text-xs text-slate-400">
                  {phases === 1 ? 'Standard residential' : phases === 3 ? 'High capacity / Commercial' : 'Split phase'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sun className={`w-5 h-5 ${hasSolar ? 'text-amber-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Solar System</p>
                <p className="text-white font-medium">
                  {hasSolar 
                    ? solarSize 
                      ? `${solarSize} kW System` 
                      : 'Solar Installed'
                    : 'No Solar'
                  }
                </p>
                {hasSolar && currentFeedInTariff > 0 && (
                  <p className="text-xs text-emerald-400">Feed-in: {currentFeedInTariff.toFixed(1)}c/kWh</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Tariff Type</p>
                <p className="text-white font-medium">
                  {primaryTariff === 'TOU' ? 'Time of Use' : primaryTariff === 'DEMAND' ? 'Demand Tariff' : 'Flat Rate'}
                  {hasControlledLoad && ' + Controlled Load'}
                </p>
                <p className="text-xs text-slate-400">
                  {primaryTariff === 'TOU' 
                    ? `Peak ${currentPeakRate.toFixed(1)}c/kWh` 
                    : primaryTariff === 'DEMAND'
                      ? 'Based on peak demand'
                      : `${currentFixedRate.toFixed(1)}c/kWh single rate`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Billing Cycle</p>
                <p className="text-white font-medium">{getBillingCycleDisplay(primaryCycle)}</p>
                <p className="text-xs text-slate-400">
                  {primaryCycle === 'MONTHLY' ? '~30 days per bill' : 
                   primaryCycle === 'BI_MONTHLY' ? '~60 days per bill' :
                   primaryCycle === 'QUARTERLY' ? '~90 days per bill' : 'Variable'}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Current Pricing</h4>
            
            {primaryTariff === 'FIXED' ? (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Fixed Rate</p>
                <p className="text-2xl font-bold text-white">{currentFixedRate.toFixed(2)}c/kWh</p>
                <p className="text-xs text-slate-400 mt-1">Same rate 24/7</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* For controlled load customers, only show the higher (peak) rate */}
                {hasControlledLoad ? (
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-red-400">Peak Rate</span>
                      <span className="text-white font-medium text-lg">
                        {currentPeakRate.toFixed(1)}c/kWh
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Primary rate (excl. controlled load)</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-red-400">Peak</span>
                        <span className="text-white font-medium">
                          {currentPeakRate.toFixed(1)}c
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-400">Off-Peak</span>
                        <span className="text-white font-medium">
                          {currentOffPeakRate.toFixed(1)}c
                        </span>
                      </div>
                    </div>
                    {currentShoulderRate > 0 && (
                      <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-amber-400">Shoulder</span>
                          <span className="text-white font-medium">
                            {currentShoulderRate.toFixed(1)}c
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Daily Supply Charge</p>
              <p className="text-xl font-bold text-white">{currentSupplyCharge.toFixed(2)}c/day</p>
              <p className="text-xs text-slate-400 mt-1">${((currentSupplyCharge * 365) / 100).toFixed(2)}/year</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Account Number</p>
                <p className="text-white font-medium font-mono">{latestBill.accountNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
