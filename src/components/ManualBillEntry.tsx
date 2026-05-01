import React, { useState } from 'react';
import { X, FileText, Calendar, Zap, DollarSign, User, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AustralianBillData, getBillingCycleFromDays } from '@/types/BillData';

interface ManualBillEntryProps {
  onSave: (bill: AustralianBillData) => void;
  onCancel: () => void;
  onSaveAndAddAnother?: (bill: AustralianBillData) => void;
}

const getInitialFormData = () => ({
  customerName: '',
  serviceAddress: '',
  averageDailyKwh: '',
  billingPeriodStart: '',
  billingPeriodEnd: '',
  usageRateCentsKwh: '',
  dailySupplyChargeCents: ''
});

const ManualBillEntry: React.FC<ManualBillEntryProps> = ({ onSave, onCancel, onSaveAndAddAnother }) => {
  const [formData, setFormData] = useState(getInitialFormData());
  const [savedCount, setSavedCount] = useState(0);

  const createBillFromForm = (): AustralianBillData => {
    // Parse dates
    const startParts = formData.billingPeriodStart.split('-');
    const endParts = formData.billingPeriodEnd.split('-');
    const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    const billingDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const averageDailyKwh = parseFloat(formData.averageDailyKwh) || 0;
    const usageRateCentsKwh = parseFloat(formData.usageRateCentsKwh) || 0;
    const dailySupplyChargeCents = parseFloat(formData.dailySupplyChargeCents) || 0;
    
    // Calculate totals from averages
    const totalUsageKwh = averageDailyKwh * billingDays;
    const usageCharges = totalUsageKwh * usageRateCentsKwh / 100;
    const supplyCharges = billingDays * dailySupplyChargeCents / 100;
    const totalBeforeGst = usageCharges + supplyCharges;
    const gst = totalBeforeGst * 0.1;
    const totalAmount = totalBeforeGst + gst;

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      fileName: 'Manual Entry',
      uploadDate: new Date().toISOString().split('T')[0],
      nmi: '',
      retailer: '',
      customerName: formData.customerName,
      serviceAddress: formData.serviceAddress,
      accountNumber: '',
      billingPeriodStart: `${startParts[2]}/${startParts[1]}/${startParts[0]}`,
      billingPeriodEnd: `${endParts[2]}/${endParts[1]}/${endParts[0]}`,
      billingDays,
      billingCycle: getBillingCycleFromDays(billingDays),
      totalUsageKwh,
      gridImportKwh: totalUsageKwh,
      solarExportKwh: 0,
      averageDailyKwh,
      energySource: 'GRID',
      tariffType: 'FIXED',
      peakUsageKwh: 0,
      offPeakUsageKwh: 0,
      shoulderUsageKwh: 0,
      controlledLoadKwh: 0,
      peakRateCentsKwh: 0,
      offPeakRateCentsKwh: 0,
      shoulderRateCentsKwh: 0,
      controlledLoadRateCentsKwh: 0,
      singleRateCentsKwh: usageRateCentsKwh,
      feedInTariffCentsKwh: 0,
      dailySupplyChargeCents,
      usageCharges,
      supplyCharges,
      solarCredits: 0,
      discounts: 0,
      gst,
      totalAmount,
      powerPhases: 1,
      hasSolar: false,
      solarSystemSize: null,
      dueDate: ''
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bill = createBillFromForm();
    onSave(bill);
  };

  const handleSaveAndAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    const bill = createBillFromForm();
    
    if (onSaveAndAddAnother) {
      onSaveAndAddAnother(bill);
    } else {
      onSave(bill);
    }
    
    // Reset form for next entry, keeping customer name and address
    setFormData(prev => ({
      ...getInitialFormData(),
      customerName: prev.customerName,
      serviceAddress: prev.serviceAddress,
      usageRateCentsKwh: prev.usageRateCentsKwh,
      dailySupplyChargeCents: prev.dailySupplyChargeCents
    }));
    setSavedCount(prev => prev + 1);
  };

  // Calculate preview values
  const getPreviewValues = () => {
    if (!formData.billingPeriodStart || !formData.billingPeriodEnd || !formData.averageDailyKwh) {
      return null;
    }
    
    const startParts = formData.billingPeriodStart.split('-');
    const endParts = formData.billingPeriodEnd.split('-');
    const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    const billingDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (billingDays <= 0) return null;
    
    const averageDailyKwh = parseFloat(formData.averageDailyKwh) || 0;
    const usageRateCentsKwh = parseFloat(formData.usageRateCentsKwh) || 0;
    const dailySupplyChargeCents = parseFloat(formData.dailySupplyChargeCents) || 0;
    
    const totalUsageKwh = averageDailyKwh * billingDays;
    const usageCharges = totalUsageKwh * usageRateCentsKwh / 100;
    const supplyCharges = billingDays * dailySupplyChargeCents / 100;
    const totalBeforeGst = usageCharges + supplyCharges;
    const gst = totalBeforeGst * 0.1;
    const totalAmount = totalBeforeGst + gst;
    
    return {
      billingDays,
      totalUsageKwh: totalUsageKwh.toFixed(1),
      totalAmount: totalAmount.toFixed(2)
    };
  };

  const preview = getPreviewValues();

  const isFormValid = formData.customerName && 
    formData.serviceAddress && 
    formData.averageDailyKwh && 
    formData.billingPeriodStart && 
    formData.billingPeriodEnd &&
    formData.usageRateCentsKwh &&
    formData.dailySupplyChargeCents;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Manual Bill Entry</h2>
              <p className="text-sm text-slate-400">
                {savedCount > 0 
                  ? `${savedCount} bill${savedCount > 1 ? 's' : ''} saved - add another`
                  : 'Enter your bill details'
                }
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-cyan-400" /> Name on Bill
              </Label>
              <Input
                value={formData.customerName}
                onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="e.g., John Smith"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-slate-300 flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> Service Address
              </Label>
              <Input
                value={formData.serviceAddress}
                onChange={e => setFormData(prev => ({ ...prev, serviceAddress: e.target.value }))}
                placeholder="e.g., 123 Main St, Sydney NSW 2000"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          {/* Billing Period */}
          <div className="space-y-4">
            <Label className="text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Billing Period
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1">Start Date</Label>
                <Input
                  type="date"
                  value={formData.billingPeriodStart}
                  onChange={e => setFormData(prev => ({ ...prev, billingPeriodStart: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1">End Date</Label>
                <Input
                  type="date"
                  value={formData.billingPeriodEnd}
                  onChange={e => setFormData(prev => ({ ...prev, billingPeriodEnd: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Usage */}
          <div>
            <Label className="text-slate-300 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Average Daily Usage (kWh)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.averageDailyKwh}
              onChange={e => setFormData(prev => ({ ...prev, averageDailyKwh: e.target.value }))}
              placeholder="e.g., 15.5"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Found on your bill as "Average daily usage"</p>
          </div>

          {/* Tariff Rates */}
          <div className="space-y-4">
            <Label className="text-slate-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-400" /> Tariff Rates
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1">Usage Rate (c/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.usageRateCentsKwh}
                  onChange={e => setFormData(prev => ({ ...prev, usageRateCentsKwh: e.target.value }))}
                  placeholder="e.g., 28.5"
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1">Daily Supply (c/day)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.dailySupplyChargeCents}
                  onChange={e => setFormData(prev => ({ ...prev, dailySupplyChargeCents: e.target.value }))}
                  placeholder="e.g., 95.0"
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-slate-300">Calculated Values</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-400">Days</p>
                  <p className="text-lg font-semibold text-white">{preview.billingDays}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total kWh</p>
                  <p className="text-lg font-semibold text-cyan-400">{preview.totalUsageKwh}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Est. Total</p>
                  <p className="text-lg font-semibold text-emerald-400">${preview.totalAmount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Saved count indicator */}
          {savedCount > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 text-sm font-bold">{savedCount}</span>
              </div>
              <p className="text-sm text-emerald-400">
                {savedCount} bill{savedCount > 1 ? 's' : ''} saved successfully
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              {savedCount > 0 ? 'Done' : 'Cancel'}
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveAndAddAnother}
              disabled={!isFormValid}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Save & Add Another
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              Save & Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualBillEntry;
