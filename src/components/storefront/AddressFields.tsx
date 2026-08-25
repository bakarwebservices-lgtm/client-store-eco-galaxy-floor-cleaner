'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getGeoPack, getProvinces, getCities, normalizeCity } from '@/lib/geo';
import { Search, ChevronDown, Check, X, MapPin } from 'lucide-react';

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

  // City search combobox state
  const [cityQuery, setCityQuery] = useState(city || '');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize cityQuery if parent `city` prop changes externally
  useEffect(() => {
    setCityQuery(city || '');
  }, [city]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!cityQuery.trim()) return cities;
    const q = cityQuery.toLowerCase().trim();
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  }, [cities, cityQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cityContainerRef.current &&
        !cityContainerRef.current.contains(event.target as Node)
      ) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (selectedCityName: string) => {
    setCity(selectedCityName);
    setCityQuery(selectedCityName);
    setIsCityDropdownOpen(false);

    // Auto-fill province if city has a known province
    const found = cities.find(
      (c) => c.name.toLowerCase() === selectedCityName.toLowerCase()
    );
    if (found?.province) {
      setProvince(found.province);
    }
  };

  const handleCustomCityConfirm = () => {
    if (cityQuery.trim()) {
      const normalized = normalizeCity(cityQuery.trim(), country);
      setCity(normalized);
      setCityQuery(normalized);
      setIsCityDropdownOpen(false);
    }
  };

  // Restrict phone to numeric digits only
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    // Allow maximum 11 digits (e.g. 03001234567)
    const limited = rawDigits.slice(0, 11);
    setPhone(limited);
  };

  return (
    <div className="space-y-3">
      {/* Street Address */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`${idPrefix}-street`}
            className="block text-[11px] font-semibold text-muted-foreground"
          >
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
          placeholder="House/Apartment #, Street/Road, Sector/Area"
          className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.address ? 'border-destructive' : 'border-input'
          }`}
        />
        {errors.address && (
          <p className="text-[11px] text-destructive">{errors.address}</p>
        )}
      </div>

      {/* Grid: Searchable City Combobox, Province Selector, Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Searchable City Combobox */}
        <div className="space-y-1 relative" ref={cityContainerRef}>
          <label
            htmlFor={`${idPrefix}-city`}
            className="block text-[11px] font-semibold text-muted-foreground"
          >
            City *
          </label>

          {geo.hasStructuredCities ? (
            <div className="relative">
              <div className="relative flex items-center">
                <input
                  id={`${idPrefix}-city`}
                  type="text"
                  required
                  disabled={disabled}
                  aria-required="true"
                  autoComplete="off"
                  value={cityQuery}
                  onFocus={() => setIsCityDropdownOpen(true)}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setCity(e.target.value);
                    setIsCityDropdownOpen(true);
                  }}
                  placeholder="Search or type city (e.g. Lahore, Karachi)"
                  className={`w-full rounded-lg border bg-background pl-8 pr-7 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.city ? 'border-destructive' : 'border-input'
                  }`}
                />
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                {cityQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCityQuery('');
                      setCity('');
                      setIsCityDropdownOpen(true);
                    }}
                    className="absolute right-2.5 p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete Floating Dropdown */}
              {isCityDropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-xl animate-in fade-in duration-100 text-xs">
                  {filteredCities.length > 0 ? (
                    <div className="p-1 space-y-0.5">
                      {filteredCities.slice(0, 40).map((c) => {
                        const isSelected =
                          city.toLowerCase() === c.name.toLowerCase();
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => handleSelectCity(c.name)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? 'bg-primary/10 font-bold text-primary'
                                : 'text-foreground hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin
                                className={`h-3 w-3 ${
                                  c.isMajor
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                }`}
                              />
                              <span>{c.name}</span>
                              {c.province && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({c.province})
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted-foreground space-y-2">
                      <p className="text-[11px]">
                        No pre-listed city matching &quot;{cityQuery}&quot;
                      </p>
                    </div>
                  )}

                  {/* Custom City Option Button */}
                  {cityQuery.trim() && (
                    <div className="border-t border-border p-1 bg-muted/40">
                      <button
                        type="button"
                        onClick={handleCustomCityConfirm}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-primary hover:bg-primary/10 font-semibold transition-colors"
                      >
                        <span>📍 Use custom city:</span>
                        <span className="underline italic truncate max-w-[150px]">
                          &quot;{cityQuery.trim()}&quot;
                        </span>
                      </button>
                    </div>
                  )}
                </div>
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
              onChange={(e) => {
                setCity(e.target.value);
                setCityQuery(e.target.value);
              }}
              placeholder="City name"
              className={`w-full rounded-lg border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.city ? 'border-destructive' : 'border-input'
              }`}
            />
          )}
          {errors.city && (
            <p className="text-[11px] text-destructive">{errors.city}</p>
          )}
        </div>

        {/* Province / State Selector */}
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-province`}
            className="block text-[11px] font-semibold text-muted-foreground"
          >
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
          {errors.province && (
            <p className="text-[11px] text-destructive">{errors.province}</p>
          )}
        </div>

        {/* Postal Code */}
        {setPostalCode && (
          <div className="space-y-1">
            <label
              htmlFor={`${idPrefix}-postal-code`}
              className="block text-[11px] font-semibold text-muted-foreground"
            >
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

      {/* Phone Number Field with country prefix badge & numeric restriction */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`${idPrefix}-phone`}
            className="block text-[11px] font-semibold text-muted-foreground"
          >
            Mobile Contact Number *
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {phone.length}/11 digits
          </span>
        </div>

        <div className="relative flex items-center">
          {/* Dial code prefix badge */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted border border-r-0 border-input rounded-l-lg text-xs font-bold text-foreground select-none shrink-0">
            <span>🇵🇰</span>
            <span>{geo.phoneRule.dialCode || '+92'}</span>
          </div>

          <input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={11}
            required
            disabled={disabled}
            aria-required="true"
            autoComplete="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder={geo.phoneRule.placeholder}
            className={`w-full rounded-r-lg rounded-l-none border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              errors.phone ? 'border-destructive' : 'border-input'
            }`}
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          {geo.phoneRule.formatHelp}
        </p>
        {errors.phone && (
          <p className="text-[11px] text-destructive">{errors.phone}</p>
        )}
      </div>
    </div>
  );
}
