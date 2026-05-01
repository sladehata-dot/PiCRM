import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Trash2, Eye, X, Calendar, Zap, Sun } from 'lucide-react';
import { AustralianBillData, PI_RATE_CENTS_KWH, getBillingCycleDisplay, calculateEffectiveRate } from '@/types/BillData';
import { Input } from '@/components/ui/input';

interface BillHistoryProps {
  bills: AustralianBillData[];
  onDeleteBill: (id: string) => void;
}

const BillHistory: React.FC<BillHistoryProps> = ({ bills, onDeleteBill }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'usage' | 'days'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedBill, setSelectedBill] = useState<AustralianBillData | null>(null);

  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills.filter(bill => 
      bill.billingPeriodStart.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billingPeriodEnd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.retailer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getBillingCycleDisplay(bill.billingCycle).toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
        const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
        comparison = dateA.getTime() - dateB.getTime();
      } else if (sortField === 'amount') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortField === 'usage') {
        comparison = a.totalUsageKwh - b.totalUsageKwh;
      } else if (sortField === 'days') {
        comparison = a.billingDays - b.billingDays;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [bills, searchTerm, sortField, sortDirection]);

  const toggleSort = (field: 'date' | 'amount' | 'usage' | 'days') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'date' | 'amount' | 'usage' | 'days' }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-slate-500" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-cyan-400" />
      : <ChevronDown className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Bill History</h2>
            <p className="text-slate-400">{bills.length} bill{bills.length !== 1 ? 's' : ''} uploaded</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white w-64"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white"
                    >
                      Billing Period
                      <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => toggleSort('days')}
                      className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white"
                    >
                      Days / Type
                      <SortIcon field="days" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Retailer</th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => toggleSort('usage')}
                      className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white"
                    >
                      Usage (kWh)
                      <SortIcon field="usage" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Daily Avg</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Tariff</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Rate</th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => toggleSort('amount')}
                      className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white"
                    >
                      Total
                      <SortIcon field="amount" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Pi Cost</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedBills.map((bill, index) => {
                  const piCost = (bill.gridImportKwh * PI_RATE_CENTS_KWH) / 100;
                  const savings = bill.totalAmount - piCost;
                  const effectiveRate = calculateEffectiveRate(bill);
                  const cycleDisplay = getBillingCycleDisplay(bill.billingCycle);
                  
                  return (
                    <tr key={bill.id ?? index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="text-white text-sm font-medium">
                              {bill.billingPeriodStart}
                            </p>
                            <p className="text-xs text-slate-500">to {bill.billingPeriodEnd}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{bill.billingDays} days</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            cycleDisplay === 'Monthly' ? 'bg-cyan-500/20 text-cyan-400' :
                            cycleDisplay === 'Quarterly' ? 'bg-purple-500/20 text-purple-400' :
                            cycleDisplay === 'Bi-Monthly' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-600 text-slate-300'
                          }`}>
                            {cycleDisplay}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{bill.retailer}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <span className="text-white text-sm font-medium">{bill.gridImportKwh.toLocaleString()}</span>
                          {bill.hasSolar && (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <Sun className="w-3 h-3" />
                              -{bill.solarExportKwh}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cyan-400 text-sm font-medium">{bill.averageDailyKwh.toFixed(1)} kWh</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          bill.tariffType === 'TOU' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : bill.tariffType === 'DEMAND'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-600 text-slate-300'
                        }`}>
                          {bill.tariffType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">
                            {bill.tariffType === 'FIXED' 
                              ? `${bill.singleRateCentsKwh.toFixed(1)}c` 
                              : `${bill.peakRateCentsKwh.toFixed(0)}/${bill.offPeakRateCentsKwh.toFixed(0)}c`
                            }
                          </p>
                          <p className="text-xs text-slate-500">Eff: {effectiveRate.toFixed(1)}c</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm font-medium">${bill.totalAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-emerald-400 text-sm font-medium">${piCost.toFixed(2)}</span>
                          <p className={`text-xs ${savings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {savings > 0 ? `Save $${savings.toFixed(2)}` : `+$${Math.abs(savings).toFixed(2)}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedBill(bill)}
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                          <button 
                            onClick={() => onDeleteBill(bill.id ?? "")}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete bill"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredAndSortedBills.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No bills found</p>
            </div>
          )}
        </div>

        {/* Bill Detail Modal */}
        {selectedBill && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Bill Details</h3>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Customer</p>
                    <p className="text-white">{selectedBill.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">NMI</p>
                    <p className="text-white font-mono">{selectedBill.nmi}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Service Address</p>
                    <p className="text-white">{selectedBill.serviceAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Retailer</p>
                    <p className="text-white">{selectedBill.retailer}</p>
                  </div>
                </div>

                {/* Billing Period */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">Billing Period</p>
                      <p className="text-white text-lg font-medium">
                        {selectedBill.billingPeriodStart} - {selectedBill.billingPeriodEnd}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        selectedBill.billingCycle === 'MONTHLY' ? 'bg-cyan-500/20 text-cyan-400' :
                        selectedBill.billingCycle === 'QUARTERLY' ? 'bg-purple-500/20 text-purple-400' :
                        selectedBill.billingCycle === 'BI_MONTHLY' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {getBillingCycleDisplay(selectedBill.billingCycle)}
                      </span>
                      <p className="text-slate-400 text-sm mt-1">{selectedBill.billingDays} days</p>
                    </div>
                  </div>
                </div>

                {/* Usage Details */}
                <div>
                  <h4 className="text-white font-medium mb-3">Usage Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Grid Import</p>
                      <p className="text-white font-medium">{selectedBill.gridImportKwh.toLocaleString()} kWh</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Solar Export</p>
                      <p className="text-white font-medium">{selectedBill.solarExportKwh.toLocaleString()} kWh</p>
                    </div>
                    <div className="bg-cyan-500/20 rounded-lg p-3 border border-cyan-500/30">
                      <p className="text-xs text-cyan-400">Daily Average</p>
                      <p className="text-white font-medium">{selectedBill.averageDailyKwh.toFixed(2)} kWh</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Power Phases</p>
                      <p className="text-white font-medium">{selectedBill.powerPhases} Phase</p>
                    </div>
                  </div>
                </div>

                {/* Rate Details */}
                <div>
                  <h4 className="text-white font-medium mb-3">
                    Rate Details 
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      selectedBill.tariffType === 'TOU' ? 'bg-purple-500/20 text-purple-400' :
                      selectedBill.tariffType === 'DEMAND' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-600 text-slate-300'
                    }`}>
                      {selectedBill.tariffType === 'TOU' ? 'Time of Use' : 
                       selectedBill.tariffType === 'DEMAND' ? 'Demand' : 'Fixed Rate'}
                    </span>
                  </h4>
                  
                  {selectedBill.tariffType === 'TOU' ? (
                    // TOU Breakdown
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-red-500/20 rounded-lg p-3">
                        <p className="text-xs text-red-400">Peak</p>
                        <p className="text-white font-medium">{selectedBill.peakUsageKwh.toLocaleString()} kWh</p>
                        <p className="text-xs text-slate-400">{selectedBill.peakRateCentsKwh.toFixed(2)}c/kWh</p>
                      </div>
                      <div className="bg-blue-500/20 rounded-lg p-3">
                        <p className="text-xs text-blue-400">Off-Peak</p>
                        <p className="text-white font-medium">{selectedBill.offPeakUsageKwh.toLocaleString()} kWh</p>
                        <p className="text-xs text-slate-400">{selectedBill.offPeakRateCentsKwh.toFixed(2)}c/kWh</p>
                      </div>
                      <div className="bg-amber-500/20 rounded-lg p-3">
                        <p className="text-xs text-amber-400">Shoulder</p>
                        <p className="text-white font-medium">{selectedBill.shoulderUsageKwh.toLocaleString()} kWh</p>
                        <p className="text-xs text-slate-400">{selectedBill.shoulderRateCentsKwh.toFixed(2)}c/kWh</p>
                      </div>
                      <div className="bg-purple-500/20 rounded-lg p-3">
                        <p className="text-xs text-purple-400">Controlled</p>
                        <p className="text-white font-medium">{selectedBill.controlledLoadKwh.toLocaleString()} kWh</p>
                        <p className="text-xs text-slate-400">{selectedBill.controlledLoadRateCentsKwh.toFixed(2)}c/kWh</p>
                      </div>
                    </div>
                  ) : (
                    // Fixed Rate Display
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-cyan-500/20 rounded-lg p-3 border border-cyan-500/30">
                        <p className="text-xs text-cyan-400">Fixed Rate</p>
                        <p className="text-white font-medium">{selectedBill.singleRateCentsKwh.toFixed(2)}c/kWh</p>
                        <p className="text-xs text-slate-400">Same rate 24/7</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Daily Supply</p>
                        <p className="text-white font-medium">{selectedBill.dailySupplyChargeCents.toFixed(2)}c/day</p>
                        <p className="text-xs text-slate-400">${(selectedBill.dailySupplyChargeCents * selectedBill.billingDays / 100).toFixed(2)} total</p>
                      </div>
                      <div className="bg-purple-500/20 rounded-lg p-3">
                        <p className="text-xs text-purple-400">Effective Rate</p>
                        <p className="text-white font-medium">{calculateEffectiveRate(selectedBill).toFixed(2)}c/kWh</p>
                        <p className="text-xs text-slate-400">Incl. all charges</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Charges */}
                <div>
                  <h4 className="text-white font-medium mb-3">Charges</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Usage Charges</span>
                      <span className="text-white">${selectedBill.usageCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Supply Charges ({selectedBill.dailySupplyChargeCents.toFixed(1)}c × {selectedBill.billingDays} days)</span>
                      <span className="text-white">${selectedBill.supplyCharges.toFixed(2)}</span>
                    </div>
                    {selectedBill.solarCredits > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Solar Credits ({selectedBill.feedInTariffCentsKwh}c/kWh × {selectedBill.solarExportKwh} kWh)</span>
                        <span className="text-emerald-400">-${selectedBill.solarCredits.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedBill.discounts > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Discounts</span>
                        <span className="text-emerald-400">-${selectedBill.discounts.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">GST</span>
                      <span className="text-white">${selectedBill.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-medium pt-2 border-t border-slate-700">
                      <span className="text-white">Total</span>
                      <span className="text-white">${selectedBill.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Pi Comparison */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <h4 className="text-emerald-400 font-medium mb-3">Pi Energy Comparison</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Pi Cost ({PI_RATE_CENTS_KWH}c/kWh × {selectedBill.gridImportKwh.toLocaleString()} kWh)</span>
                      <span className="text-white">${((selectedBill.gridImportKwh * PI_RATE_CENTS_KWH) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">No Supply Charge</span>
                      <span className="text-emerald-400">$0.00</span>
                    </div>
                    <div className="flex justify-between text-base font-medium pt-2 border-t border-emerald-500/30">
                      <span className="text-emerald-400">Potential Savings</span>
                      <span className="text-emerald-400">
                        ${(selectedBill.totalAmount - ((selectedBill.gridImportKwh * PI_RATE_CENTS_KWH) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillHistory;
