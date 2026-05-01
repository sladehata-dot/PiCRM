import React, { useState, useEffect } from 'react';
import { Home, Users, Car, Sun, Battery, TrendingUp, HelpCircle, Check, ChevronDown, ChevronUp, Building2, MapPin } from 'lucide-react';

export interface QualifierData {
  postcode: string | null;
  isPropertyOwner: boolean | null;
  propertyType: 'freestanding' | 'duplex' | 'townhouse' | 'unit_lowrise' | 'highrise' | null;
  propertyStatus: 'owner_occupied' | 'rented' | null;
  numberOfResidents: number | null;
  residentsLikelyToChange: boolean | null;
  likelyToSellIn5Years: boolean | null;
  hasEV: boolean | null;
  evPlanTimeline: 'no_plans' | 'next_12_months' | '1_3_years' | null;
  hasSolar: boolean | null;
  solarAge: 'no_solar' | 'less_than_5_years' | '5_years_or_more' | null;
  hasHomeBattery: boolean | null;
}

// Pi Energy service areas - Australian postcodes
export const SERVICE_AREAS = {
  QLD_BRISBANE_GOLD_COAST: {
    start: 4000,
    end: 4230,
    name: 'Brisbane & Gold Coast',
    description: 'Brisbane CBD to Tugun/Currumbin'
  },
  NSW_SYDNEY: {
    start: 2000,
    end: 2250,
    name: 'Sydney Metro',
    description: 'Sydney CBD and surrounds'
  },
  NSW_NEWCASTLE: {
    start: 2259,
    end: 2340,
    name: 'Newcastle & Hunter Valley',
    description: 'Newcastle and Hunter region'
  },
};




// Check if postcode is in Pi Energy service area
export const isPostcodeInServiceArea = (postcode: string): boolean => {
  const code = parseInt(postcode, 10);
  if (isNaN(code)) return false;
  
  return Object.values(SERVICE_AREAS).some(
    area => code >= area.start && code <= area.end
  );
};

// Get the service area name for a postcode
export const getServiceAreaName = (postcode: string): string | null => {
  const code = parseInt(postcode, 10);
  if (isNaN(code)) return null;
  
  for (const [state, area] of Object.entries(SERVICE_AREAS)) {
    if (code >= area.start && code <= area.end) {
      return area.name;
    }
  }
  return null;
};

// Validate Australian postcode format (4 digits)
export const isValidAustralianPostcode = (postcode: string): boolean => {
  return /^\d{4}$/.test(postcode);
};

// Helper function to check if property type is eligible for Pi Energy
export const isPropertyTypeEligible = (propertyType: QualifierData['propertyType']): boolean => {
  return propertyType === 'freestanding' || propertyType === 'duplex' || propertyType === 'townhouse';
};

// Get display name for property type
export const getPropertyTypeLabel = (propertyType: QualifierData['propertyType']): string => {
  switch (propertyType) {
    case 'freestanding': return 'Free-standing House';
    case 'duplex': return 'Duplex / Semi-detached';
    case 'townhouse': return 'Townhouse';
    case 'unit_lowrise': return 'Unit / Apartment (Low-rise)';
    case 'highrise': return 'High-rise Apartment';
    default: return 'Not specified';
  }
};


interface CustomerQualifiersProps {
  qualifiers: QualifierData;
  onUpdate: (qualifiers: QualifierData) => void;
}

const CustomerQualifiers: React.FC<CustomerQualifiersProps> = ({ qualifiers, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localQualifiers, setLocalQualifiers] = useState<QualifierData>(qualifiers);

  useEffect(() => {
    setLocalQualifiers(qualifiers);
  }, [qualifiers]);

  const handleChange = (field: keyof QualifierData, value: any) => {
    const updated = { ...localQualifiers, [field]: value };
    
    // Auto-set related fields
    if (field === 'hasSolar') {
      if (value === false) {
        updated.solarAge = 'no_solar';
      } else if (value === true && updated.solarAge === 'no_solar') {
        updated.solarAge = null;
      }
    }
    
    if (field === 'hasEV') {
      if (value === true) {
        updated.evPlanTimeline = null; // Clear EV plans if they already have one
      }
    }
    
    setLocalQualifiers(updated);
    onUpdate(updated);
  };

  const getCompletionPercentage = () => {
    const fields = [
      localQualifiers.postcode,
      localQualifiers.isPropertyOwner,
      localQualifiers.propertyType,
      localQualifiers.propertyStatus,
      localQualifiers.numberOfResidents,
      localQualifiers.residentsLikelyToChange,
      localQualifiers.likelyToSellIn5Years,
      localQualifiers.hasEV,
      localQualifiers.hasEV === false ? localQualifiers.evPlanTimeline : true,
      localQualifiers.hasSolar,
      localQualifiers.hasSolar === true ? localQualifiers.solarAge : true,
      localQualifiers.hasHomeBattery
    ];
    const completed = fields.filter(f => f !== null && f !== undefined).length;
    return Math.round((completed / fields.length) * 100);
  };


  const completionPercentage = getCompletionPercentage();

  const YesNoButton = ({ 
    value, 
    selected, 
    onClick 
  }: { 
    value: boolean; 
    selected: boolean | null; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        selected === value
          ? value 
            ? 'bg-emerald-500 text-white' 
            : 'bg-red-500 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </button>
  );

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-4 border-b border-slate-700 flex items-center justify-between hover:from-purple-500/30 hover:to-pink-500/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Customer Qualifiers</h3>
            <p className="text-sm text-slate-400">Help us understand your situation better</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Completion indicator */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  completionPercentage === 100 ? 'bg-emerald-500' : 'bg-purple-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${
              completionPercentage === 100 ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {completionPercentage}%
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Ownership */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Are you the property owner?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.isPropertyOwner} 
                  onClick={() => handleChange('isPropertyOwner', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.isPropertyOwner} 
                  onClick={() => handleChange('isPropertyOwner', false)} 
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-3 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">What type of property is it?</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleChange('propertyType', 'freestanding')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyType === 'freestanding'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Free-standing House
                </button>
                <button
                  onClick={() => handleChange('propertyType', 'duplex')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyType === 'duplex'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Duplex / Semi-detached
                </button>
                <button
                  onClick={() => handleChange('propertyType', 'townhouse')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyType === 'townhouse'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Townhouse
                </button>
                <button
                  onClick={() => handleChange('propertyType', 'unit_lowrise')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyType === 'unit_lowrise'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Unit / Apartment (Low-rise)
                </button>
                <button
                  onClick={() => handleChange('propertyType', 'highrise')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyType === 'highrise'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  High-rise Apartment
                </button>
              </div>
            </div>

            {/* Property Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Is property owner occupied or rented?</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChange('propertyStatus', 'owner_occupied')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyStatus === 'owner_occupied'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Owner Occupied
                </button>
                <button
                  onClick={() => handleChange('propertyStatus', 'rented')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    localQualifiers.propertyStatus === 'rented'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Rented
                </button>
              </div>
            </div>

            {/* Number of Residents */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Number of residents?</label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChange('numberOfResidents', Math.max(1, (localQualifiers.numberOfResidents || 1) - 1))}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={localQualifiers.numberOfResidents || ''}
                  onChange={(e) => handleChange('numberOfResidents', parseInt(e.target.value) || null)}
                  placeholder="0"
                  className="w-16 h-10 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={() => handleChange('numberOfResidents', Math.min(20, (localQualifiers.numberOfResidents || 0) + 1))}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Residents Likely to Change */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Is this likely to change?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.residentsLikelyToChange} 
                  onClick={() => handleChange('residentsLikelyToChange', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.residentsLikelyToChange} 
                  onClick={() => handleChange('residentsLikelyToChange', false)} 
                />
              </div>
            </div>

            {/* Likely to Sell */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Likely to sell in next 5 years?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.likelyToSellIn5Years} 
                  onClick={() => handleChange('likelyToSellIn5Years', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.likelyToSellIn5Years} 
                  onClick={() => handleChange('likelyToSellIn5Years', false)} 
                />
              </div>
            </div>

            {/* Has EV */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-medium text-slate-300">Do you have an EV?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.hasEV} 
                  onClick={() => handleChange('hasEV', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.hasEV} 
                  onClick={() => handleChange('hasEV', false)} 
                />
              </div>
            </div>

            {/* EV Plans (only show if no EV) */}
            {localQualifiers.hasEV === false && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <label className="text-sm font-medium text-slate-300">Planning to get an EV?</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleChange('evPlanTimeline', 'no_plans')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localQualifiers.evPlanTimeline === 'no_plans'
                        ? 'bg-slate-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    No Plans
                  </button>
                  <button
                    onClick={() => handleChange('evPlanTimeline', 'next_12_months')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localQualifiers.evPlanTimeline === 'next_12_months'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Next 12 Months
                  </button>
                  <button
                    onClick={() => handleChange('evPlanTimeline', '1_3_years')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localQualifiers.evPlanTimeline === '1_3_years'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    1-3 Years
                  </button>
                </div>
              </div>
            )}

            {/* Has Solar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <label className="text-sm font-medium text-slate-300">Do you have solar?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.hasSolar} 
                  onClick={() => handleChange('hasSolar', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.hasSolar} 
                  onClick={() => handleChange('hasSolar', false)} 
                />
              </div>
            </div>

            {/* Solar Age (only show if has solar) */}
            {localQualifiers.hasSolar === true && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <label className="text-sm font-medium text-slate-300">Is your solar less than 5 years old?</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleChange('solarAge', 'less_than_5_years')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localQualifiers.solarAge === 'less_than_5_years'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Less than 5 years
                  </button>
                  <button
                    onClick={() => handleChange('solarAge', '5_years_or_more')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localQualifiers.solarAge === '5_years_or_more'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    5 years or more
                  </button>
                </div>
              </div>
            )}

            {/* Has Home Battery */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                <label className="text-sm font-medium text-slate-300">Do you have a home battery?</label>
              </div>
              <div className="flex gap-2">
                <YesNoButton 
                  value={true} 
                  selected={localQualifiers.hasHomeBattery} 
                  onClick={() => handleChange('hasHomeBattery', true)} 
                />
                <YesNoButton 
                  value={false} 
                  selected={localQualifiers.hasHomeBattery} 
                  onClick={() => handleChange('hasHomeBattery', false)} 
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {completionPercentage === 100 && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-emerald-400" />
                <h4 className="text-emerald-400 font-medium">Profile Complete</h4>
              </div>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-white">
                    {localQualifiers.postcode} • {getServiceAreaName(localQualifiers.postcode || '') || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Property</p>
                  <p className="text-white">
                    {localQualifiers.isPropertyOwner ? 'Owner' : 'Not Owner'} • {' '}
                    {localQualifiers.propertyStatus === 'owner_occupied' ? 'Owner Occupied' : 'Rented'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Property Type</p>
                  <p className="text-white">
                    {getPropertyTypeLabel(localQualifiers.propertyType)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Household</p>
                  <p className="text-white">
                    {localQualifiers.numberOfResidents} resident{localQualifiers.numberOfResidents !== 1 ? 's' : ''} • {' '}
                    {localQualifiers.residentsLikelyToChange ? 'May change' : 'Stable'}
                  </p>
                </div>


                <div>
                  <p className="text-slate-400">Future Plans</p>
                  <p className="text-white">
                    {localQualifiers.likelyToSellIn5Years ? 'May sell in 5 years' : 'No plans to sell'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Electric Vehicle</p>
                  <p className="text-white">
                    {localQualifiers.hasEV 
                      ? 'Has EV' 
                      : localQualifiers.evPlanTimeline === 'next_12_months'
                        ? 'Planning in 12 months'
                        : localQualifiers.evPlanTimeline === '1_3_years'
                          ? 'Planning in 1-3 years'
                          : 'No EV plans'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Solar</p>
                  <p className="text-white">
                    {localQualifiers.hasSolar 
                      ? localQualifiers.solarAge === 'less_than_5_years'
                        ? 'Solar < 5 years old'
                        : 'Solar 5+ years old'
                      : 'No Solar'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Battery</p>
                  <p className="text-white">
                    {localQualifiers.hasHomeBattery ? 'Has Home Battery' : 'No Battery'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerQualifiers;
