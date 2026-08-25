'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getGeoPack, getProvinces, getCities, normalizeCity } from '@/lib/geo';
import { ChevronDown, MapPin } from 'lucide-react';

export interface AddressFieldsProps {
  idPrefix?: string;
  country?: string;
  address: string;
  setAddress: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  province: string;
  setProvince: (val: string) => void;
  postalCode?: string;
  setPostalCode?: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function AddressFields({
  idPrefix = 'addr',
  country = 'Pakistan',
  address,
  setAddress,
  city,
  setCity,
  province,
  setProvince,
  postalCode = '',
  setPostalCode,
  phone,
  setPhone,
  errors = {},
  disabled = false,
}: AddressFieldsProps) {
  const geo = useMemo(() => getGeoPack(country), [country]);
  const provinces = useMemo(() => getProvinces(country), [country]);
  const cities = useMemo(() => getCities(country), [country]);

  // Is the current city in our structured list?
  const matchedCity = useMemo(() => {
    if (!city || !geo.hasStructuredCities) return null;
    const norm = normalizeCity(city, country).toLowerCase();
    return cities.find((c) => c.name.toLowerCase() === norm);
  }, [city, cities, country, geo.hasStructuredCities]);

  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityText, setCustomCityText] = useState('');

  // Initialize or update isCustomCity state when city or country changes
  useEffect(() => {
    if (geo.hasStructuredCities) {
      if (!city) {
        setIsCustomCity(false);
      } else if (!matchedCity && city !== '') {
        setIsCustomCity(true);
        setCustomCityText(city);
      } else {
        setIsCustomCity(false);
      }
    } else {
      setIsCustomCity(false);
    }
  }, [city, matchedCity, geo.hasStructuredCities]);

  // Handle dropdown city change
  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__OTHER__') {
      setIsCustomCity(true);
      setCity(customCityText || '');
    } else {
      setIsCustomCity(false);
      setCity(val);
      // Auto-set province if city has defined province and province is empty
      const found = cities.find((c) => c.name === val);
      if (found?.province && (!province || !provinces.some((p) => p.name === province))) {
        setProvince(found.province);
      }
    }
  };

  const handleCustomCityTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomCityText(val);
    setCity(val);
  };

  return (
    <div className="space-y-3">
      {/* Street Address */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}-street`} className="block text-[11px] font-semibold text-muted-foreground">
            Street Address *
          </label>
          <span className="text-[10px] text-muted-foreground">
            Min {geo.addressMinLength} characters
          </span>
        </div>
        <input
          id={`${idPrefix}-street`}
          type="text"
          required
          disabled={disabled}
          aria-required="true"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House/Apartment #, Street/Road, Area/Sector"
          className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.address ? 'border-destructive' : 'border-input'
          }`}
        />
        {errors.address && (
          <p className="text-[11px] text-destructive">{errors.address}</p>
        )}
      </div>

      {/* Grid: City, Province/State, Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* City Field (Combobox/Select for PK, Input for International) */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-city`} className="block text-[11px] font-semibold text-muted-foreground">
            City *
          </label>

          {geo.hasStructuredCities ? (
            <div className="space-y-1.5">
              <div className="relative">
                <select
                  id={`${idPrefix}-city-select`}
                  disabled={disabled}
                  value={isCustomCity ? '__OTHER__' : (matchedCity ? matchedCity.name : '')}
                  onChange={handleCitySelectChange}
                  className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium appearance-none pr-8 ${
                    errors.city ? 'border-destructive' : 'border-input'
                  }`}
                >
                  <option value="" disabled>
                    -- Select City --
                  </option>
                  <optgroup label="Major Metros">
                    {cities
                      .filter((c) => c.isMajor)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Other Cities & Towns">
                    {cities
                      .filter((c) => !c.isMajor)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                  <option value="__OTHER__">📍 Other (Type Custom City)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* If "Other" is chosen, render text input */}
              {isCustomCity && (
                <input
                  id={`${idPrefix}-city-custom`}
                  type="text"
                  required
                  disabled={disabled}
                  value={customCityText}
                  onChange={handleCustomCityTextChange}
                  placeholder="Enter your town/city name"
                  className="w-full rounded-lg border border-primary/40 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary animate-in fade-in duration-150"
                />
              )}
            </div>
          ) : (
            <input
              id={`${idPrefix}-city`}
              type="text"
              required
              disabled={disabled}
              aria-required="true"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City name"
              className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.city ? 'border-destructive' : 'border-input'
              }`}
            />
          )}
          {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
        </div>

        {/* Province / State (Dropdown for PK, Input for International) */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-province`} className="block text-[11px] font-semibold text-muted-foreground">
            Province / State
          </label>

          {geo.hasStructuredProvinces ? (
            <div className="relative">
              <select
                id={`${idPrefix}-province`}
                disabled={disabled}
                value={province || ''}
                onChange={(e) => setProvince(e.target.value)}
                className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8 ${
                  errors.province ? 'border-destructive' : 'border-input'
                }`}
              >
                <option value="">-- Select Province --</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <input
              id={`${idPrefix}-province`}
              type="text"
              disabled={disabled}
              autoComplete="address-level1"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="State / Region"
              className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.province ? 'border-destructive' : 'border-input'
              }`}
            />
          )}
          {errors.province && <p className="text-[11px] text-destructive">{errors.province}</p>}
        </div>

        {/* Postal Code (Optional in PK, standard in others) */}
        {setPostalCode && (
          <div className="space-y-1">
            <label htmlFor={`${idPrefix}-postal-code`} className="block text-[11px] font-semibold text-muted-foreground">
              Postal Code (Optional)
            </label>
            <input
              id={`${idPrefix}-postal-code`}
              type="text"
              disabled={disabled}
              autoComplete="postal-code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="54000"
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>

      {/* Phone Number Field */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}-phone`} className="block text-[11px] font-semibold text-muted-foreground">
            Contact Phone Number *
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {geo.phoneRule.placeholder}
          </span>
        </div>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          required
          disabled={disabled}
          aria-required="true"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={geo.phoneRule.placeholder}
          className={`w-full rounded-lg border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.phone ? 'border-destructive' : 'border-input'
          }`}
        />
        <p className="text-[10px] text-muted-foreground">{geo.phoneRule.formatHelp}</p>
        {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
      </div>
    </div>
  );
}
