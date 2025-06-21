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

// Enhanced Form Section Component
const FormSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  gradient: string;
}> = memo(({ title, icon, children, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-1 group`}>
    <div className="bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-lg font-heading bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </h3>
      </div>
      {children}
    </div>
  </div>
));

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
      <FuturisticInput
        label="Character Name"
        name="name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Enter character name..."
        required
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuturisticSelect
          label="Role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          options={[
            { value: "MAIN", label: "Main Character" },
            { value: "SUPPORTING", label: "Supporting Character" },
            { value: "BACKGROUND", label: "Background Character" },
          ]}
          required
        />

        <FuturisticInput
          label="Age"
          name="age"
          value={formData.age || ''}
          onChange={(e) => handleChange('age', e.target.value)}
          placeholder="e.g., 17 years old"
        />
      </div>

      <FuturisticInput
        label="Image URL"
        name="imageUrl"
        type="url"
        value={formData.imageUrl || ''}
        onChange={(e) => handleChange('imageUrl', e.target.value)}
        placeholder="https://example.com/character.jpg"
      />

      <FuturisticInput
        label="Description"
        name="description"
        value={formData.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Enter character description..."
        rows={4}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuturisticSelect
          label="Status"
          value={formData.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          options={[
            { value: "", label: "Select Status" },
            { value: "Alive", label: "Alive" },
            { value: "Deceased", label: "Deceased" },
            { value: "Unknown", label: "Unknown" },
          ]}
        />

        <FuturisticSelect
          label="Gender"
          value={formData.gender || ''}
          onChange={(e) => handleChange('gender', e.target.value)}
          options={[
            { value: "", label: "Select Gender" },
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
        />
      </div>
    </div>
  );

  const renderPhysicalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuturisticSelect
          label="Blood Type"
          value={formData.bloodType || ''}
          onChange={(e) => handleChange('bloodType', e.target.value)}
          options={[
            { value: "", label: "Select Blood Type" },
            { value: "A", label: "A" },
            { value: "B", label: "B" },
            { value: "AB", label: "AB" },
            { value: "O", label: "O" },
          ]}
        />

        <FuturisticInput
          label="Species"
          name="species"
          value={formData.species || ''}
          onChange={(e) => handleChange('species', e.target.value)}
          placeholder="e.g., Human, Demon, Robot"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuturisticInput
          label="Height"
          name="height"
          value={formData.height || ''}
          onChange={(e) => handleChange('height', e.target.value)}
          placeholder="e.g., 170 cm"
        />
        
        <FuturisticInput
          label="Weight"
          name="weight"
          value={formData.weight || ''}
          onChange={(e) => handleChange('weight', e.target.value)}
          placeholder="e.g., 65 kg"
        />
      </div>

      <ArrayInput
        label="Powers & Abilities"
        value={formData.powersAbilities || []}
        onChange={(value) => handleChange('powersAbilities', value)}
        placeholder="Super strength, Telekinesis, Flight..."
        icon="⚡"
      />

      <ArrayInput
        label="Weapons"
        value={formData.weapons || []}
        onChange={(value) => handleChange('weapons', value)}
        placeholder="Sword, Gun, Magic Staff..."
        icon="🗡️"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuturisticInput
          label="Native Name"
          name="nativeName"
          value={formData.nativeName || ''}
          onChange={(e) => handleChange('nativeName', e.target.value)}
          placeholder="Original Japanese name"
        />
        
        <FuturisticInput
          label="Site URL"
          name="siteUrl"
          type="url"
          value={formData.siteUrl || ''}
          onChange={(e) => handleChange('siteUrl', e.target.value)}
          placeholder="https://example.com/character"
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-base font-semibold text-white/95">
          🎂 Date of Birth
        </label>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Year"
            value={formData.dateOfBirth?.year || ''}
            onChange={(e) => handleDateOfBirthChange('year', e.target.value)}
            className="bg-black/40 backdrop-blur-sm border-2 border-white/30 hover:border-white/50 transition-all duration-300 rounded-xl px-6 py-4 text-white placeholder-white/50 text-base focus:border-blue-500 focus:outline-none focus:ring-0"
          />
          <input
            type="number"
            placeholder="Month"
            min="1"
            max="12"
            value={formData.dateOfBirth?.month || ''}
            onChange={(e) => handleDateOfBirthChange('month', e.target.value)}
            className="bg-black/40 backdrop-blur-sm border-2 border-white/30 hover:border-white/50 transition-all duration-300 rounded-xl px-6 py-4 text-white placeholder-white/50 text-base focus:border-blue-500 focus:outline-none focus:ring-0"
          />
          <input
            type="number"
            placeholder="Day"
            min="1"
            max="31"
            value={formData.dateOfBirth?.day || ''}
            onChange={(e) => handleDateOfBirthChange('day', e.target.value)}
            className="bg-black/40 backdrop-blur-sm border-2 border-white/30 hover:border-white/50 transition-all duration-300 rounded-xl px-6 py-4 text-white placeholder-white/50 text-base focus:border-blue-500 focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );

  const renderEnrichmentData = () => (
    <div className="space-y-6">
      <FuturisticInput
        label="Personality Analysis"
        name="personalityAnalysis"
        value={formData.personalityAnalysis || ''}
        onChange={(e) => handleChange('personalityAnalysis', e.target.value)}
        placeholder="AI-generated personality analysis..."
        rows={4}
      />

      <FuturisticInput
        label="Key Relationships"
        name="keyRelationships"
        value={formData.keyRelationships?.map(r => `${r.relatedCharacterName}: ${r.relationshipDescription} (${r.relationType})`).join('\n') || ''}
        onChange={(e) => {
          const lines = e.target.value.split('\n').filter(line => line.trim());
          const relationships = lines.map(line => {
            const match = line.match(/^(.+?): (.+?) \((.+?)\)$/);
            if (match) {
              return {
                relatedCharacterName: match[1].trim(),
                relationshipDescription: match[2].trim(),
                relationType: match[3].trim(),
              };
            }
            return {
              relatedCharacterName: line.trim(),
              relationshipDescription: '',
              relationType: '',
            };
          });
          handleChange('keyRelationships', relationships);
        }}
        placeholder="Character Name: Description (Relation Type)"
        rows={3}
      />

      <FuturisticInput
        label="Detailed Abilities"
        name="detailedAbilities"
        value={formData.detailedAbilities?.map(a => `${a.abilityName}: ${a.abilityDescription}${a.powerLevel ? ` (${a.powerLevel})` : ''}`).join('\n') || ''}
        onChange={(e) => {
          const lines = e.target.value.split('\n').filter(line => line.trim());
          const abilities = lines.map(line => {
            const match = line.match(/^(.+?): (.+?)(?: \((.+?)\))?$/);
            if (match) {
              return {
                abilityName: match[1].trim(),
                abilityDescription: match[2].trim(),
                powerLevel: match[3]?.trim(),
              };
            }
            return {
              abilityName: line.trim(),
              abilityDescription: '',
              powerLevel: '',
            };
          });
          handleChange('detailedAbilities', abilities);
        }}
        placeholder="Ability Name: Description (Power Level)"
        rows={3}
      />

      <FuturisticInput
        label="Major Character Arcs"
        name="majorCharacterArcs"
        value={formData.majorCharacterArcs?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('majorCharacterArcs', e.target.value)}
        placeholder="One character arc per line..."
        rows={3}
      />

      <FuturisticInput
        label="Trivia"
        name="trivia"
        value={formData.trivia?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('trivia', e.target.value)}
        placeholder="One trivia fact per line..."
        rows={3}
      />

      <FuturisticInput
        label="Backstory Details"
        name="backstoryDetails"
        value={formData.backstoryDetails || ''}
        onChange={(e) => handleChange('backstoryDetails', e.target.value)}
        placeholder="Detailed backstory information..."
        rows={4}
      />

      <FuturisticInput
        label="Character Development"
        name="characterDevelopment"
        value={formData.characterDevelopment || ''}
        onChange={(e) => handleChange('characterDevelopment', e.target.value)}
        placeholder="Character growth and development..."
        rows={4}
      />

      <FuturisticInput
        label="Notable Quotes"
        name="notableQuotes"
        value={formData.notableQuotes?.join('\n') || ''}
        onChange={(e) => handleEnrichmentArrayChange('notableQuotes', e.target.value)}
        placeholder="One quote per line..."
        rows={3}
      />

      <FuturisticInput
        label="Symbolism"
        name="symbolism"
        value={formData.symbolism || ''}
        onChange={(e) => handleChange('symbolism', e.target.value)}
        placeholder="Character symbolism and themes..."
        rows={3}
      />

      <FuturisticInput
        label="Fan Reception"
        name="fanReception"
        value={formData.fanReception || ''}
        onChange={(e) => handleChange('fanReception', e.target.value)}
        placeholder="How fans perceive this character..."
        rows={3}
      />

      <FuturisticInput
        label="Cultural Significance"
        name="culturalSignificance"
        value={formData.culturalSignificance || ''}
        onChange={(e) => handleChange('culturalSignificance', e.target.value)}
        placeholder="Cultural impact and significance..."
        rows={3}
      />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-heading bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3">
          Edit Character
        </h2>
        <p className="text-white/70 text-lg">Update character information and metadata</p>
        
        {/* Enrichment Status */}
        {formData.enrichmentStatus && (
          <div className="mt-6 inline-flex items-center gap-3 bg-blue-500/20 text-blue-300 px-6 py-3 rounded-full border border-blue-500/30">
            <span className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="font-medium">Enrichment Status: {formData.enrichmentStatus}</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-black/30 backdrop-blur-sm border border-white/30 rounded-2xl p-2">
          {[
            { id: "basic" as const, label: "Basic Info", icon: "👤" },
            { id: "details" as const, label: "Physical Details", icon: "⚡" },
            { id: "enrichment" as const, label: "AI Enrichment", icon: "🧠" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-semibold text-base">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        {activeTab === "basic" && (
          <FormSection
            title="Basic Information"
            icon="👤"
            gradient="from-blue-600 to-cyan-600"
          >
            {renderBasicInfo()}
          </FormSection>
        )}

        {/* Physical Details Section */}
        {activeTab === "details" && (
          <FormSection
            title="Physical Details"
            icon="⚡"
            gradient="from-yellow-600 to-orange-600"
          >
            {renderPhysicalDetails()}
          </FormSection>
        )}

        {/* AI Enrichment Section */}
        {activeTab === "enrichment" && (
          <FormSection
            title="AI Enrichment Data"
            icon="🧠"
            gradient="from-purple-600 to-pink-600"
          >
            {renderEnrichmentData()}
            
            {/* Enrich Button */}
            <div className="pt-8 border-t border-white/20">
              <button
                type="button"
                onClick={() => onEnrich(characterIndex)}
                disabled={isEnriching}
                className={`w-full py-4 px-8 rounded-xl font-semibold transition-all duration-300 border text-lg
                  ${!isEnriching
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-purple-500/30 shadow-lg shadow-purple-500/25 hover:scale-105'
                    : 'bg-gray-600/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                  }`}
              >
                {isEnriching ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Enriching with AI...
                  </span>
                ) : (
                  "🤖 Enrich Character with AI"
                )}
              </button>
            </div>
          </FormSection>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 pt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-black/40 backdrop-blur-sm border border-white/30 text-white py-4 px-8 rounded-xl hover:bg-black/50 hover:border-white/40 transition-all duration-300 disabled:opacity-50 text-lg font-semibold"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 px-8 rounded-xl font-semibold transition-all duration-300 border border-blue-500/30 shadow-lg shadow-blue-500/25 disabled:opacity-50 text-lg hover:scale-105"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              "Save Character"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(CharacterEditorComponent); 