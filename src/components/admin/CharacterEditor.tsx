import React, { useState, useEffect, memo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";

interface Character {
  id?: number;
  name: string;
  imageUrl?: string;
  role: string;
  description?: string;
  status?: string;
  gender?: string;
  age?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  bloodType?: string;
  height?: string;
  weight?: string;
  species?: string;
  powersAbilities?: string[];
  weapons?: string[];
  nativeName?: string;
  siteUrl?: string;
  voiceActors?: Array<{
    id?: number;
    name: string;
    language: string;
    imageUrl?: string;
  }>;
  relationships?: Array<{
    relatedCharacterId?: number;
    relationType: string;
  }>;
  enrichmentStatus?: "pending" | "success" | "failed" | "skipped";
  enrichmentAttempts?: number;
  lastAttemptTimestamp?: number;
  lastErrorMessage?: string;
  enrichmentTimestamp?: number;
  personalityAnalysis?: string;
  keyRelationships?: Array<{
    relatedCharacterName: string;
    relationshipDescription: string;
    relationType: string;
  }>;
  detailedAbilities?: Array<{
    abilityName: string;
    abilityDescription: string;
    powerLevel?: string;
  }>;
  majorCharacterArcs?: string[];
  trivia?: string[];
  backstoryDetails?: string;
  characterDevelopment?: string;
  notableQuotes?: string[];
  symbolism?: string;
  fanReception?: string;
  culturalSignificance?: string;
}

interface CharacterEditorProps {
  character: Character;
  characterIndex: number;
  animeId: Id<"anime">;
  onSave: (character: Character) => void;
  onCancel: () => void;
  onEnrich: (characterIndex: number) => void;
  isSaving: boolean;
  isEnriching: boolean;
}

// BRUTALIST Form Section Component
const BrutalistFormSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = memo(({ title, icon, children }) => (
  <div className="bg-black border-4 border-white p-6 mb-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 bg-white text-black flex items-center justify-center border-4 border-black font-black text-2xl">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </div>
));

// BRUTALIST Input Component
const BrutalistInput: React.FC<{
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  rows?: number;
  className?: string;
}> = memo(({ label, name, type = "text", value, onChange, placeholder, required, min, max, step, rows, className = "" }) => {
  return (
    <div className="mb-4">
      <label className="block text-lg font-black text-white uppercase tracking-wide mb-3">
        {label}
        {required && <span className="text-red-500 ml-2">*</span>}
      </label>
      
      {rows ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
        />
      )}
    </div>
  );
});

// BRUTALIST Array Input Component
const BrutalistArrayInput: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  icon: string;
}> = memo(({ label, value, onChange, placeholder, icon }) => {
  const [inputValue, setInputValue] = useState(value.join(', '));
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const arrayValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
    onChange(arrayValue);
  };

  return (
    <div className="mb-4">
      <label className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-wide mb-3">
        <span className="text-2xl">{icon}</span>
        {label}
      </label>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
      />
      
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span key={index} className="bg-white text-black px-3 py-1 border-4 border-black font-black uppercase tracking-wide text-sm">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// BRUTALIST Auto-Resizing Textarea Component
const BrutalistAutoResizeTextarea: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
  maxRows?: number;
  className?: string;
}> = memo(({ label, name, value, onChange, placeholder, required, minRows = 3, maxRows = 10, className = "" }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    
    // Set height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Show scrollbar if content exceeds max height
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minRows, maxRows]);

  // Adjust height on value change
  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Adjust height on mount
  React.useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <div className={`mb-6 ${className}`}>
      <label className="block text-lg font-black text-white uppercase tracking-wide mb-3">
        {label}
        {required && <span className="text-red-500 ml-2">*</span>}
      </label>
      
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={minRows}
        className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none overflow-hidden"
        style={{ minHeight: `${minRows * 1.5}rem` }}
      />
      
      {/* Character count indicator */}
      <div className="mt-2 text-right">
        <span className="text-sm font-black text-white uppercase tracking-wide">
          {value.length} CHARACTERS
        </span>
      </div>
    </div>
  );
});

// Enhanced Input Component
const FuturisticInput: React.FC<{
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  rows?: number;
  className?: string;
}> = memo(({ label, name, type = "text", value, onChange, placeholder, required, min, max, step, rows, className = "" }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-base font-semibold text-white/95">
        {label}
        {required && <span className="text-red-400 text-lg">*</span>}
      </label>
      
      <div className="relative">
        {rows ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={rows}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
              ${isFocused 
                ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-black/50' 
                : 'border-white/30 hover:border-white/50'
              }
              rounded-xl px-6 py-4 text-white placeholder-white/50 text-base
              focus:outline-none focus:ring-0 resize-none
              ${className}
            `}
          />
        ) : (
          <input
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
            step={step}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
              ${isFocused 
                ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-black/50' 
                : 'border-white/30 hover:border-white/50'
              }
              rounded-xl px-6 py-4 text-white placeholder-white/50 text-base
              focus:outline-none focus:ring-0
              ${className}
            `}
          />
        )}
        
        {/* Animated border effect */}
        {isFocused && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-pulse opacity-50"></div>
          </div>
        )}
      </div>
    </div>
  );
});

// Enhanced Array Input Component
const ArrayInput: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  icon: string;
}> = memo(({ label, value, onChange, placeholder, icon }) => {
  const [inputValue, setInputValue] = useState(value.join(', '));
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const arrayValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
    onChange(arrayValue);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-base font-semibold text-white/95">
        <span className="text-xl">{icon}</span>
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
            ${isFocused 
              ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-black/50' 
              : 'border-white/30 hover:border-white/50'
            }
            rounded-xl px-6 py-4 text-white placeholder-white/50 text-base
            focus:outline-none focus:ring-0
          `}
        />
        
        {isFocused && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-pulse opacity-50"></div>
          </div>
        )}
      </div>
    </div>
  );
});

// Enhanced Select Component
const FuturisticSelect: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}> = memo(({ label, value, onChange, options, required, className = "" }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-base font-semibold text-white/95">
        {label}
        {required && <span className="text-red-400 text-lg">*</span>}
      </label>
      
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
            ${isFocused 
              ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-black/50' 
              : 'border-white/30 hover:border-white/50'
            }
            rounded-xl px-6 py-4 text-white text-base
            focus:outline-none focus:ring-0 appearance-none
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23E76F51' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 16px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px',
            paddingRight: '48px'
          }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value} className="bg-black text-white">
              {option.label}
            </option>
          ))}
        </select>
        
        {isFocused && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-pulse opacity-50"></div>
          </div>
        )}
      </div>
    </div>
  );
});

const CharacterEditorComponent: React.FC<CharacterEditorProps> = ({
  character,
  characterIndex,
  animeId,
  onSave,
  onCancel,
  onEnrich,
  isSaving,
  isEnriching,
}) => {
  const [formData, setFormData] = useState<Character>(character);
  const [activeTab, setActiveTab] = useState<"basic" | "details" | "enrichment">("basic");

  useEffect(() => {
    setFormData(character);
  }, [character]);

  const handleChange = (field: keyof Character, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof Character, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: arrayValue }));
  };

  const handleDateOfBirthChange = (field: 'year' | 'month' | 'day', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value);
    setFormData(prev => ({
      ...prev,
      dateOfBirth: {
        ...prev.dateOfBirth,
        [field]: numValue,
      }
    }));
  };

  const handleVoiceActorChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      voiceActors: prev.voiceActors?.map((va, i) => 
        i === index ? { ...va, [field]: value } : va
      ) || []
    }));
  };

  const handleAddVoiceActor = () => {
    setFormData(prev => ({
      ...prev,
      voiceActors: [...(prev.voiceActors || []), { name: '', language: '' }]
    }));
  };

  const handleRemoveVoiceActor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      voiceActors: prev.voiceActors?.filter((_, i) => i !== index) || []
    }));
  };

  const handleRelationshipChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      relationships: prev.relationships?.map((rel, i) => 
        i === index ? { ...rel, [field]: value } : rel
      ) || []
    }));
  };

  const handleAddRelationship = () => {
    setFormData(prev => ({
      ...prev,
      relationships: [...(prev.relationships || []), { relationType: '' }]
    }));
  };

  const handleRemoveRelationship = (index: number) => {
    setFormData(prev => ({
      ...prev,
      relationships: prev.relationships?.filter((_, i) => i !== index) || []
    }));
  };

  const handleEnrichmentArrayChange = (field: keyof Character, value: string) => {
    const arrayValue = value.split('\n').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: arrayValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrutalistInput
          label="Name"
          name="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Character name"
          required
        />

        <BrutalistInput
          label="Role"
          name="role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          placeholder="Main, Supporting, etc."
          required
        />
      </div>

      <BrutalistAutoResizeTextarea
        label="Description"
        name="description"
        value={formData.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Character description..."
        required
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BrutalistInput
          label="Status"
          name="status"
          value={formData.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          placeholder="Alive, Deceased, etc."
        />

        <BrutalistInput
          label="Gender"
          name="gender"
          value={formData.gender || ''}
          onChange={(e) => handleChange('gender', e.target.value)}
          placeholder="Male, Female, etc."
        />

        <BrutalistInput
          label="Age"
          name="age"
          value={formData.age || ''}
          onChange={(e) => handleChange('age', e.target.value)}
          placeholder="Age or age range"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BrutalistInput
          label="Birth Year"
          name="birthYear"
          type="number"
          value={formData.dateOfBirth?.year || ''}
          onChange={(e) => handleDateOfBirthChange('year', e.target.value)}
          placeholder="Year"
        />

        <BrutalistInput
          label="Birth Month"
          name="birthMonth"
          type="number"
          value={formData.dateOfBirth?.month || ''}
          onChange={(e) => handleDateOfBirthChange('month', e.target.value)}
          placeholder="Month (1-12)"
          min="1"
          max="12"
        />

        <BrutalistInput
          label="Birth Day"
          name="birthDay"
          type="number"
          value={formData.dateOfBirth?.day || ''}
          onChange={(e) => handleDateOfBirthChange('day', e.target.value)}
          placeholder="Day (1-31)"
          min="1"
          max="31"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrutalistInput
          label="Image URL"
          name="imageUrl"
          value={formData.imageUrl || ''}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder="Character image URL"
        />

        <BrutalistInput
          label="Site URL"
          name="siteUrl"
          value={formData.siteUrl || ''}
          onChange={(e) => handleChange('siteUrl', e.target.value)}
          placeholder="Official character page URL"
        />
      </div>

      <BrutalistInput
        label="Native Name"
        name="nativeName"
        value={formData.nativeName || ''}
        onChange={(e) => handleChange('nativeName', e.target.value)}
        placeholder="Character name in original language"
      />
    </div>
  );

  const renderPhysicalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BrutalistInput
          label="Blood Type"
          name="bloodType"
          value={formData.bloodType || ''}
          onChange={(e) => handleChange('bloodType', e.target.value)}
          placeholder="A, B, AB, O"
        />

        <BrutalistInput
          label="Height"
          name="height"
          value={formData.height || ''}
          onChange={(e) => handleChange('height', e.target.value)}
          placeholder="Height in cm or ft"
        />

        <BrutalistInput
          label="Weight"
          name="weight"
          value={formData.weight || ''}
          onChange={(e) => handleChange('weight', e.target.value)}
          placeholder="Weight in kg or lbs"
        />
      </div>

      <BrutalistInput
        label="Species"
        name="species"
        value={formData.species || ''}
        onChange={(e) => handleChange('species', e.target.value)}
        placeholder="Human, Demon, etc."
      />

      <BrutalistArrayInput
        label="Powers & Abilities"
        value={formData.powersAbilities || []}
        onChange={(value) => handleChange('powersAbilities', value)}
        placeholder="Super strength, magic, etc."
        icon="⚡"
      />

      <BrutalistArrayInput
        label="Weapons"
        value={formData.weapons || []}
        onChange={(value) => handleChange('weapons', value)}
        placeholder="Sword, gun, etc."
        icon="🗡️"
      />

      {/* Voice Actors Section */}
      <div className="space-y-4">
        <h4 className="text-xl font-black text-white uppercase tracking-wide border-b-4 border-white pb-2">
          VOICE ACTORS
        </h4>
        
        {(formData.voiceActors || []).map((actor, index) => (
          <div key={index} className="bg-white border-4 border-black p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BrutalistInput
                label="Name"
                name={`voiceActor-${index}-name`}
                value={actor.name}
                onChange={(e) => handleVoiceActorChange(index, 'name', e.target.value)}
                placeholder="Voice actor name"
              />
              
              <BrutalistInput
                label="Language"
                name={`voiceActor-${index}-language`}
                value={actor.language}
                onChange={(e) => handleVoiceActorChange(index, 'language', e.target.value)}
                placeholder="Japanese, English, etc."
              />
              
              <BrutalistInput
                label="Image URL"
                name={`voiceActor-${index}-imageUrl`}
                value={actor.imageUrl || ''}
                onChange={(e) => handleVoiceActorChange(index, 'imageUrl', e.target.value)}
                placeholder="Voice actor image URL"
              />
            </div>
            
            <button
              type="button"
              onClick={() => handleRemoveVoiceActor(index)}
              className="mt-4 bg-red-500 text-white border-4 border-red-500 px-4 py-2 font-black uppercase tracking-wide hover:bg-red-600 transition-colors"
            >
              REMOVE VOICE ACTOR
            </button>
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleAddVoiceActor}
          className="w-full bg-green-500 text-white border-4 border-green-500 px-6 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors"
        >
          + ADD VOICE ACTOR
        </button>
      </div>

      {/* Relationships Section */}
      <div className="space-y-4">
        <h4 className="text-xl font-black text-white uppercase tracking-wide border-b-4 border-white pb-2">
          RELATIONSHIPS
        </h4>
        
        {(formData.relationships || []).map((relationship, index) => (
          <div key={index} className="bg-white border-4 border-black p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BrutalistInput
                label="Related Character ID"
                name={`relationship-${index}-characterId`}
                type="number"
                value={relationship.relatedCharacterId || ''}
                onChange={(e) => handleRelationshipChange(index, 'relatedCharacterId', e.target.value)}
                placeholder="Character ID"
              />
              
              <BrutalistInput
                label="Relation Type"
                name={`relationship-${index}-relationType`}
                value={relationship.relationType}
                onChange={(e) => handleRelationshipChange(index, 'relationType', e.target.value)}
                placeholder="Friend, Enemy, Lover, etc."
              />
            </div>
            
            <button
              type="button"
              onClick={() => handleRemoveRelationship(index)}
              className="mt-4 bg-red-500 text-white border-4 border-red-500 px-4 py-2 font-black uppercase tracking-wide hover:bg-red-600 transition-colors"
            >
              REMOVE RELATIONSHIP
            </button>
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleAddRelationship}
          className="w-full bg-green-500 text-white border-4 border-green-500 px-6 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors"
        >
          + ADD RELATIONSHIP
        </button>
      </div>
    </div>
  );

  const renderEnrichmentData = () => (
    <div className="space-y-6">
      <BrutalistAutoResizeTextarea
        label="Personality Analysis"
        name="personalityAnalysis"
        value={formData.personalityAnalysis || ''}
        onChange={(e) => handleChange('personalityAnalysis', e.target.value)}
        placeholder="AI-generated personality analysis..."
        minRows={4}
        maxRows={8}
      />

      <BrutalistAutoResizeTextarea
        label="Major Character Arcs"
        name="majorCharacterArcs"
        value={formData.majorCharacterArcs?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('majorCharacterArcs', e.target.value)}
        placeholder="One character arc per line..."
        minRows={3}
        maxRows={6}
      />

      <BrutalistAutoResizeTextarea
        label="Trivia"
        name="trivia"
        value={formData.trivia?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('trivia', e.target.value)}
        placeholder="One trivia fact per line..."
        minRows={3}
        maxRows={6}
      />

      <BrutalistAutoResizeTextarea
        label="Backstory Details"
        name="backstoryDetails"
        value={formData.backstoryDetails || ''}
        onChange={(e) => handleChange('backstoryDetails', e.target.value)}
        placeholder="Detailed backstory information..."
        minRows={4}
        maxRows={8}
      />

      <BrutalistAutoResizeTextarea
        label="Character Development"
        name="characterDevelopment"
        value={formData.characterDevelopment || ''}
        onChange={(e) => handleChange('characterDevelopment', e.target.value)}
        placeholder="Character growth and development..."
        minRows={4}
        maxRows={8}
      />

      <BrutalistAutoResizeTextarea
        label="Notable Quotes"
        name="notableQuotes"
        value={formData.notableQuotes?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('notableQuotes', e.target.value)}
        placeholder="One quote per line..."
        minRows={3}
        maxRows={6}
      />

      <BrutalistAutoResizeTextarea
        label="Symbolism"
        name="symbolism"
        value={formData.symbolism || ''}
        onChange={(e) => handleChange('symbolism', e.target.value)}
        placeholder="Character symbolism and themes..."
        minRows={3}
        maxRows={6}
      />

      <BrutalistAutoResizeTextarea
        label="Fan Reception"
        name="fanReception"
        value={formData.fanReception || ''}
        onChange={(e) => handleChange('fanReception', e.target.value)}
        placeholder="How fans perceive this character..."
        minRows={3}
        maxRows={6}
      />

      <BrutalistAutoResizeTextarea
        label="Cultural Significance"
        name="culturalSignificance"
        value={formData.culturalSignificance || ''}
        onChange={(e) => handleChange('culturalSignificance', e.target.value)}
        placeholder="Cultural impact and significance..."
        minRows={3}
        maxRows={6}
      />
    </div>
  );

  return (
    <div className="bg-black border-4 border-white p-6 max-w-6xl mx-auto">
      {/* BRUTALIST Header with Character Image */}
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Character Image Preview */}
          <div className="flex-shrink-0">
            <div className="w-48 h-64 bg-white border-4 border-black overflow-hidden">
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Character Image Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-6xl ${formData.imageUrl ? 'hidden' : ''}`}>
                👤
              </div>
            </div>
          </div>
          
          {/* Header Content */}
          <div className="flex-1">
            <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-wider">
              EDIT CHARACTER: {character.name || 'UNTITLED'}
            </h2>
            <p className="text-black text-xl uppercase tracking-wide mb-4">
              UPDATE CHARACTER INFORMATION AND METADATA
            </p>
            
            {/* Character Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-black text-white px-3 py-2 border-4 border-black">
                <div className="text-xs font-black uppercase tracking-wide">ROLE</div>
                <div className="font-black text-sm">{character.role || 'N/A'}</div>
              </div>
              <div className="bg-black text-white px-3 py-2 border-4 border-black">
                <div className="text-xs font-black uppercase tracking-wide">STATUS</div>
                <div className="font-black text-sm">{character.status || 'N/A'}</div>
              </div>
              <div className="bg-black text-white px-3 py-2 border-4 border-black">
                <div className="text-xs font-black uppercase tracking-wide">GENDER</div>
                <div className="font-black text-sm">{character.gender || 'N/A'}</div>
              </div>
              <div className="bg-black text-white px-3 py-2 border-4 border-black">
                <div className="text-xs font-black uppercase tracking-wide">AGE</div>
                <div className="font-black text-sm">{character.age || 'N/A'}</div>
              </div>
            </div>
            
            {/* Enrichment Status */}
            {formData.enrichmentStatus && (
              <div className="inline-flex items-center gap-3 bg-yellow-500 text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
                <span className="w-3 h-3 bg-black"></span>
                <span>ENRICHMENT: {formData.enrichmentStatus.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-white border-4 border-black">
          {[
            { id: "basic" as const, label: "BASIC INFO", icon: "👤" },
            { id: "details" as const, label: "PHYSICAL DETAILS", icon: "⚡" },
            { id: "enrichment" as const, label: "AI ENRICHMENT", icon: "🧠" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 border-r-4 border-black last:border-r-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-black uppercase tracking-wide text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        {activeTab === "basic" && (
          <BrutalistFormSection
            title="BASIC INFORMATION"
            icon="👤"
          >
            {renderBasicInfo()}
          </BrutalistFormSection>
        )}

        {/* Physical Details Section */}
        {activeTab === "details" && (
          <BrutalistFormSection
            title="PHYSICAL DETAILS"
            icon="⚡"
          >
            {renderPhysicalDetails()}
          </BrutalistFormSection>
        )}

        {/* AI Enrichment Section */}
        {activeTab === "enrichment" && (
          <BrutalistFormSection
            title="AI ENRICHMENT DATA"
            icon="🧠"
          >
            {renderEnrichmentData()}
            
            {/* Enrich Button */}
            <div className="pt-6 border-t-4 border-white">
              <button
                type="button"
                onClick={() => onEnrich(characterIndex)}
                disabled={isEnriching}
                className={`w-full py-4 px-6 font-black uppercase tracking-wide transition-colors border-4 text-lg
                  ${!isEnriching
                    ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                    : 'bg-gray-500 text-gray-300 border-gray-500 cursor-not-allowed'
                  }`}
              >
                {isEnriching ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-4 border-white border-t-transparent animate-spin"></div>
                    ENRICHING WITH AI...
                  </span>
                ) : (
                  "🤖 ENRICH CHARACTER WITH AI"
                )}
              </button>
            </div>
          </BrutalistFormSection>
        )}

        {/* Action Buttons */}
        <div className="flex gap-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-white text-black border-4 border-black px-8 py-4 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-green-500 text-white border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-4 border-white border-t-transparent animate-spin"></div>
                SAVING...
              </span>
            ) : (
              "SAVE CHARACTER"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(CharacterEditorComponent); 