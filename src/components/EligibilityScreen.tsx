import React, { useState, useEffect } from 'react';
import { Home, Users, Car, Sun, Battery, TrendingUp, CheckCircle, ArrowRight, Mail, Phone, User, Loader2, Building2, MapPin, AlertCircle, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  QualifierData, 
  isPropertyTypeEligible, 
  getPropertyTypeLabel,
  isPostcodeInServiceArea,
  isValidAustralianPostcode,
  SERVICE_AREAS
} from './CustomerQualifiers';
import ServiceAreaMap from './ServiceAreaMap';
import { useAppContext } from '@/contexts/AppContext';

interface EligibilityScreenProps {
  onEligible: (qualifiers: QualifierData) => void;
  onUpdateQualifiers: (qualifiers: QualifierData) => void;
  qualifiers: QualifierData;
}

interface P2PLeadForm {
  name: string;
  email: string;
  phone: string;
}

type IneligibilityReason = 'not_owner' | 'no_roof_space' | 'outside_service_area' | null;

const EligibilityScreen: React.FC<EligibilityScreenProps> = ({ 
  onEligible, 
  onUpdateQualifiers,
  qualifiers 
}) => {
  const { sessionCode, startNewSession, saveSession, customerContactInfo, setCustomerContactInfo } = useAppContext();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showP2PForm, setShowP2PForm] = useState(false);
  const [ineligibilityReason, setIneligibilityReason] = useState<IneligibilityReason>(null);
  const [p2pForm, setP2PForm] = useState<P2PLeadForm>({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [localQualifiers, setLocalQualifiers] = useState<QualifierData>(qualifiers);
  const [postcodeInput, setPostcodeInput] = useState(qualifiers.postcode || '');
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Contact form for eligible users
  const [contactForm, setContactForm] = useState<P2PLeadForm>({
    name: customerContactInfo.name || '',
    email: customerContactInfo.email || '',
    phone: customerContactInfo.phone || '',
  });

  // Create session on mount if not exists
  // We await this to ensure the session is created before the user can proceed
  useEffect(() => {
    const initSession = async () => {
      if (!sessionCode) {
        await startNewSession();
      }
    };
    initSession();
  }, []);


  // Sync contact form with context
  useEffect(() => {
    setContactForm({
      name: customerContactInfo.name || '',
      email: customerContactInfo.email || '',
      phone: customerContactInfo.phone || '',
    });
  }, [customerContactInfo]);


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
        updated.evPlanTimeline = null;
      }
    }
    
    setLocalQualifiers(updated);
    onUpdateQualifiers(updated);
  };

  // Handle postcode submission
  const handlePostcodeSubmit = () => {
    setPostcodeError(null);
    
    if (!postcodeInput.trim()) {
      setPostcodeError('Please enter your postcode');
      return;
    }
    
    if (!isValidAustralianPostcode(postcodeInput.trim())) {
      setPostcodeError('Please enter a valid 4-digit Australian postcode');
      return;
    }
    
    const postcode = postcodeInput.trim();
    handleChange('postcode', postcode);
    
    if (!isPostcodeInServiceArea(postcode)) {
      // Not in service area - show P2P lead capture
      setIneligibilityReason('outside_service_area');
      setShowP2PForm(true);
    } else {
      // Continue to next question (property owner)
      setCurrentStep(1);
    }
  };

  // Check if user answered "No" to property owner question
  const handlePropertyOwnerAnswer = (isOwner: boolean) => {
    handleChange('isPropertyOwner', isOwner);
    
    if (!isOwner) {
      // Not eligible - show P2P lead capture form
      setIneligibilityReason('not_owner');
      setShowP2PForm(true);
    } else {
      // Continue to next question (property type)
      setCurrentStep(2);
    }
  };

  // Check if property type is eligible
  const handlePropertyTypeAnswer = (propertyType: QualifierData['propertyType']) => {
    handleChange('propertyType', propertyType);
    
    if (!isPropertyTypeEligible(propertyType)) {
      // Not eligible due to no roof space - show P2P lead capture form
      setIneligibilityReason('no_roof_space');
      setShowP2PForm(true);
    } else {
      // Continue to next question
      setCurrentStep(3);
    }
  };

  const handleP2PSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('p2p_leads').insert({
        name: p2pForm.name || null,
        email: p2pForm.email || null,
        phone: p2pForm.phone || null,
        postcode: localQualifiers.postcode,
        is_property_owner: localQualifiers.isPropertyOwner,
        property_type: localQualifiers.propertyType,
        property_status: localQualifiers.propertyStatus,
        number_of_residents: localQualifiers.numberOfResidents,
        residents_likely_to_change: localQualifiers.residentsLikelyToChange,
        has_ev: localQualifiers.hasEV,
        ev_plan_timeline: localQualifiers.evPlanTimeline,
        has_solar: localQualifiers.hasSolar,
        solar_age: localQualifiers.solarAge,
        has_home_battery: localQualifiers.hasHomeBattery,
        ineligibility_reason: ineligibilityReason,
        lead_source: 'energy_calculator',
        status: 'new'
      });

      if (error) {
        console.error('Error saving P2P lead:', error);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error saving P2P lead:', error);
      setSubmitted(true); // Still show thank you even if save fails
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All questions answered - save contact info and proceed
      const contactInfo = {
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
      };
      
      // Update local state
      setCustomerContactInfo(contactInfo);
      
      // Save session with contact info and wait for it to complete
      await saveSession(contactInfo);
      
      // User is eligible - proceed to bill upload
      onEligible(localQualifiers);
    }
  };


  const canContinue = () => {
    switch (currentStep) {
      case 0: return localQualifiers.postcode !== null && isPostcodeInServiceArea(localQualifiers.postcode);
      case 1: return localQualifiers.isPropertyOwner !== null;
      case 2: return localQualifiers.propertyType !== null;
      case 3: return localQualifiers.propertyStatus !== null;
      case 4: return localQualifiers.numberOfResidents !== null;
      case 5: return localQualifiers.residentsLikelyToChange !== null;
      case 6: return localQualifiers.likelyToSellIn5Years !== null;
      case 7: return localQualifiers.hasEV !== null && (localQualifiers.hasEV === true || localQualifiers.evPlanTimeline !== null);
      case 8: return localQualifiers.hasSolar !== null && (localQualifiers.hasSolar === false || localQualifiers.solarAge !== null);
      case 9: return localQualifiers.hasHomeBattery !== null;
      case 10: return true; // Contact details are optional
      default: return false;
    }
  };

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
      className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 ${
        selected === value
          ? value 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
            : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </button>
  );

  const questions = [
    // Step 0: Postcode (Critical eligibility question - Service Area)
    {
      icon: MapPin,
      iconColor: 'text-blue-400',
      title: 'What is your property postcode?',
      subtitle: 'We need to check if Pi Energy services are available in your area',
      content: (
        <div className="space-y-6">
          {/* Two-column layout for larger screens */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Left column: Postcode input and service info */}
            <div className="space-y-4">
              <div className="max-w-xs mx-auto lg:mx-0">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="e.g. 4217"
                    value={postcodeInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPostcodeInput(value);
                      setPostcodeError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePostcodeSubmit();
                      }
                    }}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-700 border rounded-xl text-white text-xl text-center font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                      postcodeError 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-slate-600 focus:ring-cyan-500'
                    }`}
                  />
                </div>
                {postcodeError && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{postcodeError}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-slate-300 font-medium mb-2 text-sm">Currently servicing:</h4>
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-400">
                  {Object.entries(SERVICE_AREAS).map(([key, area]) => (
                    <div key={key} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-white font-medium">{area.name}</span>
                        <p className="text-slate-500 text-xs">{area.description}</p>
                        <p className="text-slate-500 text-xs">Postcodes: {area.start} - {area.end}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePostcodeSubmit}
                disabled={!postcodeInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Availability
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Right column: Interactive map */}
            <div className="hidden lg:block">
              <ServiceAreaMap />
            </div>
          </div>

          {/* Mobile map - shown below on smaller screens */}
          <div className="lg:hidden">
            <ServiceAreaMap />
          </div>
        </div>
      )
    },

    // Step 1: Property Owner (Critical eligibility question)
    {
      icon: Home,
      iconColor: 'text-cyan-400',
      title: 'Are you the property owner?',
      subtitle: 'This helps us determine if Pi Energy is right for you',
      content: (
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => handlePropertyOwnerAnswer(true)}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 ${
              localQualifiers.isPropertyOwner === true
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Yes, I own this property
          </button>
          <button
            onClick={() => handlePropertyOwnerAnswer(false)}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 ${
              localQualifiers.isPropertyOwner === false
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            No, I'm renting
          </button>
        </div>
      )
    },
    // Step 2: Property Type (Critical eligibility question)
    {
      icon: Building2,
      iconColor: 'text-purple-400',
      title: 'What type of property do you have?',
      subtitle: 'This helps us understand if solar and battery installations are possible',
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-center text-sm mb-6">
            Pi Energy requires dedicated roof space for solar panels and the ability to install a home battery system.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            <button
              onClick={() => handlePropertyTypeAnswer('freestanding')}
              className={`px-6 py-4 rounded-xl text-base font-semibold transition-all transform hover:scale-105 ${
                localQualifiers.propertyType === 'freestanding'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5" />
                <span>Free-standing House</span>
              </div>
            </button>
            <button
              onClick={() => handlePropertyTypeAnswer('duplex')}
              className={`px-6 py-4 rounded-xl text-base font-semibold transition-all transform hover:scale-105 ${
                localQualifiers.propertyType === 'duplex'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <span>Duplex / Semi-detached</span>
              </div>
            </button>
            <button
              onClick={() => handlePropertyTypeAnswer('townhouse')}
              className={`px-6 py-4 rounded-xl text-base font-semibold transition-all transform hover:scale-105 ${
                localQualifiers.propertyType === 'townhouse'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <span>Townhouse</span>
              </div>
            </button>
            <button
              onClick={() => handlePropertyTypeAnswer('unit_lowrise')}
              className={`px-6 py-4 rounded-xl text-base font-semibold transition-all transform hover:scale-105 ${
                localQualifiers.propertyType === 'unit_lowrise'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <span>Unit / Apartment (Low-rise)</span>
              </div>
            </button>
            <button
              onClick={() => handlePropertyTypeAnswer('highrise')}
              className={`px-6 py-4 rounded-xl text-base font-semibold transition-all transform hover:scale-105 col-span-1 sm:col-span-2 max-w-xs mx-auto w-full ${
                localQualifiers.propertyType === 'highrise'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 justify-center">
                <Building2 className="w-5 h-5" />
                <span>High-rise Apartment</span>
              </div>
            </button>
          </div>
        </div>
      )
    },
    // Step 3: Property Status
    {
      icon: Home,
      iconColor: 'text-cyan-400',
      title: 'Is the property owner occupied or rented out?',
      subtitle: 'Tell us about how the property is used',
      content: (
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => handleChange('propertyStatus', 'owner_occupied')}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 ${
              localQualifiers.propertyStatus === 'owner_occupied'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Owner Occupied
          </button>
          <button
            onClick={() => handleChange('propertyStatus', 'rented')}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 ${
              localQualifiers.propertyStatus === 'rented'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Rented Out
          </button>
        </div>
      )
    },
    // Step 4: Number of Residents
    {
      icon: Users,
      iconColor: 'text-purple-400',
      title: 'How many people live at this property?',
      subtitle: 'This helps us understand your energy needs',
      content: (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handleChange('numberOfResidents', Math.max(1, (localQualifiers.numberOfResidents || 1) - 1))}
            className="w-14 h-14 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors flex items-center justify-center text-2xl font-bold"
          >
            -
          </button>
          <div className="w-24 h-14 bg-slate-700 border border-slate-600 rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{localQualifiers.numberOfResidents || 0}</span>
          </div>
          <button
            onClick={() => handleChange('numberOfResidents', Math.min(20, (localQualifiers.numberOfResidents || 0) + 1))}
            className="w-14 h-14 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors flex items-center justify-center text-2xl font-bold"
          >
            +
          </button>
        </div>
      )
    },
    // Step 5: Residents Likely to Change
    {
      icon: Users,
      iconColor: 'text-purple-400',
      title: 'Is the number of residents likely to change?',
      subtitle: 'Planning for household changes',
      content: (
        <div className="flex gap-4 justify-center">
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
      )
    },
    // Step 6: Likely to Sell
    {
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      title: 'Are you likely to sell in the next 5 years?',
      subtitle: 'Understanding your long-term plans',
      content: (
        <div className="flex gap-4 justify-center">
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
      )
    },
    // Step 7: EV
    {
      icon: Car,
      iconColor: 'text-blue-400',
      title: 'Do you have an electric vehicle?',
      subtitle: 'EVs can significantly impact energy usage',
      content: (
        <div className="space-y-6">
          <div className="flex gap-4 justify-center">
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
          {localQualifiers.hasEV === false && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-400 mb-4 text-center">Are you planning to get an EV?</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleChange('evPlanTimeline', 'no_plans')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                    localQualifiers.evPlanTimeline === 'no_plans'
                      ? 'bg-slate-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  No Plans
                </button>
                <button
                  onClick={() => handleChange('evPlanTimeline', 'next_12_months')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                    localQualifiers.evPlanTimeline === 'next_12_months'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Next 12 Months
                </button>
                <button
                  onClick={() => handleChange('evPlanTimeline', '1_3_years')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
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
        </div>
      )
    },
    // Step 8: Solar
    {
      icon: Sun,
      iconColor: 'text-yellow-400',
      title: 'Do you have solar panels?',
      subtitle: 'Solar can maximize your Pi Energy savings',
      content: (
        <div className="space-y-6">
          <div className="flex gap-4 justify-center">
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
          {localQualifiers.hasSolar === true && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-400 mb-4 text-center">How old is your solar system?</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleChange('solarAge', 'less_than_5_years')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                    localQualifiers.solarAge === 'less_than_5_years'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Less than 5 years
                </button>
                <button
                  onClick={() => handleChange('solarAge', '5_years_or_more')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
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
        </div>
      )
    },
    // Step 9: Home Battery
    {
      icon: Battery,
      iconColor: 'text-emerald-400',
      title: 'Do you have a home battery?',
      subtitle: 'Batteries help store solar energy for later use',
      content: (
        <div className="flex gap-4 justify-center">
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
      )
    },
    // Step 10: Contact Details (NEW - for capturing lead info)
    {
      icon: User,
      iconColor: 'text-cyan-400',
      title: 'Your Contact Details',
      subtitle: 'So we can send you your personalized savings report',
      content: (
        <div className="space-y-4 max-w-md mx-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h4 className="text-emerald-400 font-semibold">Great news!</h4>
            </div>
            <p className="text-slate-300 text-sm">
              Based on your answers, you're eligible for Pi Energy! Enter your details below and we'll prepare your personalized savings analysis.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Your name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                placeholder="Phone number"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          
          <p className="text-slate-500 text-xs text-center mt-4">
            Your information is secure and will only be used to provide you with your energy savings analysis.
          </p>
        </div>
      )
    }
  ];

  // P2P Lead Capture Form (shown when not eligible)
  if (showP2PForm && !submitted) {
    const isRenter = ineligibilityReason === 'not_owner';
    const isUnitDweller = ineligibilityReason === 'no_roof_space';
    const isOutsideServiceArea = ineligibilityReason === 'outside_service_area';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {isOutsideServiceArea ? (
                  <MapPin className="w-10 h-10 text-amber-400" />
                ) : isRenter ? (
                  <Home className="w-10 h-10 text-amber-400" />
                ) : (
                  <Building2 className="w-10 h-10 text-amber-400" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isOutsideServiceArea 
                  ? 'Coming Soon to Your Area!' 
                  : isRenter 
                    ? 'Coming Soon for Renters!' 
                    : 'Coming Soon for Apartment Dwellers!'}
              </h2>
              <p className="text-slate-400">
                {isOutsideServiceArea ? (
                  <>
                    Pi Energy is not yet available in postcode <span className="text-cyan-400 font-semibold">{localQualifiers.postcode}</span>, 
                    but we're rapidly expanding our service areas across Australia.
                  </>
                ) : isRenter ? (
                  <>
                    Pi Energy's current offering is for homeowners only, but we're working on an exciting 
                    <span className="text-cyan-400 font-semibold"> Peer-to-Peer (P2P) energy solution</span> for renters like you.
                  </>
                ) : (
                  <>
                    Pi Energy requires dedicated roof space for solar panels and battery installation. 
                    We're developing a <span className="text-cyan-400 font-semibold">P2P energy solution</span> for 
                    {localQualifiers.propertyType === 'highrise' ? ' high-rise apartment' : ' unit'} residents.
                  </>
                )}
              </p>
            </div>

            {isOutsideServiceArea && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-blue-400 font-semibold mb-2">Expansion Plans</h3>
                <p className="text-slate-300 text-sm">
                  We're actively working to bring Pi Energy to more areas across Australia. 
                  Leave your details and we'll notify you as soon as we're available in your region!
                </p>
                <div className="mt-3 pt-3 border-t border-blue-500/20">
                  <p className="text-slate-400 text-xs">Currently servicing:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(SERVICE_AREAS).map(([state, area]) => (
                      <span key={state} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        {area.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isOutsideServiceArea && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-cyan-400 font-semibold mb-2">What is P2P Energy?</h3>
                <p className="text-slate-300 text-sm">
                  {isRenter ? (
                    'P2P energy trading allows you to buy clean energy directly from local solar producers, even if you don\'t own your property. Stay tuned for updates!'
                  ) : (
                    'P2P energy trading will allow you to buy clean, locally-generated solar energy from nearby producers, even without your own solar panels or roof space. Perfect for apartment living!'
                  )}
                </p>
              </div>
            )}

            {isUnitDweller && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-purple-400 font-semibold mb-2">Why can't I use Pi Energy now?</h3>
                <p className="text-slate-300 text-sm">
                  Pi Energy's current solution requires:
                </p>
                <ul className="text-slate-300 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Dedicated roof space for solar panel installation</li>
                  <li>Ability to install a home battery system</li>
                  <li>Direct control over your property's electrical systems</li>
                </ul>
                <p className="text-slate-300 text-sm mt-2">
                  {localQualifiers.propertyType === 'highrise' 
                    ? 'High-rise apartments typically have shared roof space and strata restrictions that prevent individual installations.'
                    : 'Units and apartments often have shared roof space and body corporate/strata restrictions.'}
                </p>
              </div>
            )}

            <form onSubmit={handleP2PSubmit} className="space-y-4">
              <p className="text-slate-300 text-center mb-4">
                {isOutsideServiceArea 
                  ? 'Leave your details and we\'ll notify you when Pi Energy becomes available in your area.'
                  : 'Leave your details and we\'ll notify you when P2P energy becomes available.'}
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={p2pForm.name}
                    onChange={(e) => setP2PForm({ ...p2pForm, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Email address (optional)"
                    value={p2pForm.email}
                    onChange={(e) => setP2PForm({ ...p2pForm, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={p2pForm.phone}
                    onChange={(e) => setP2PForm({ ...p2pForm, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Keep Me Updated
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm"
              >
                Skip for now
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Thank you screen after P2P form submission
  if (submitted) {
    const isRenter = ineligibilityReason === 'not_owner';
    const isOutsideServiceArea = ineligibilityReason === 'outside_service_area';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-slate-400 mb-6">
              {isOutsideServiceArea 
                ? `We've noted your interest in Pi Energy for postcode ${localQualifiers.postcode}. We'll be in touch when we expand to your area.`
                : 'We\'ve noted your interest in Pi Energy\'s P2P solution. We\'ll be in touch when it becomes available in your area.'}
            </p>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-slate-300 text-sm">
                {isOutsideServiceArea ? (
                  'In the meantime, follow us on social media to stay updated on our expansion plans and energy-saving tips!'
                ) : isRenter ? (
                  'In the meantime, you might want to speak with your landlord about Pi Energy\'s homeowner solutions. They could save money on energy costs while providing you with cleaner, cheaper power!'
                ) : (
                  'In the meantime, you might want to speak with your body corporate or building management about community solar initiatives. Some buildings are exploring shared solar installations!'
                )}
              </p>
            </div>
            <a 
              href="https://pienergy.com.au" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
            >
              Learn More About Pi Energy
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main eligibility questionnaire
  const currentQuestion = questions[currentStep];
  const IconComponent = currentQuestion.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className={`w-full ${currentStep === 0 ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Step {currentStep + 1} of {questions.length}</span>
            <span className="text-slate-400 text-sm">{Math.round(((currentStep + 1) / questions.length) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className={`w-8 h-8 ${currentQuestion.iconColor}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{currentQuestion.title}</h2>
            <p className="text-slate-400">{currentQuestion.subtitle}</p>
          </div>

          <div className="mb-8">
            {currentQuestion.content}
          </div>

          {/* Navigation - only show for steps after the critical eligibility questions */}
          {currentStep > 2 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-6 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === questions.length - 1 ? 'Continue to Bill Upload' : 'Continue'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* For property type question (step 2), show continue button after selection */}
          {currentStep === 2 && localQualifiers.propertyType && isPropertyTypeEligible(localQualifiers.propertyType) && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>

              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Pi Energy branding & Staff CRM Link */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-slate-500 text-sm">
            Powered by <span className="text-cyan-400 font-semibold">Pi Energy</span> • Australia's smartest energy solution
          </p>
          <a 
            href="/crm" 
            className="inline-block text-xs text-slate-600 hover:text-purple-400 transition-colors"
          >
            Staff Access
          </a>
        </div>
      </div>
    </div>
  );
};

export default EligibilityScreen;
