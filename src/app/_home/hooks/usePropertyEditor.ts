"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../errors";
import { geocodeLocation } from "../geocoding";
import {
  createInitialPropertyForm,
  createPropertyFormFromProperty,
  idleAddressLookup,
} from "../property-form";
import { criteriaByType } from "../property-options";
import { formatManualLocationLabel } from "../property-utils";
import type {
  AddressLookupState,
  Coordinates,
  Property,
  PropertyFormState,
  PropertyType,
} from "../types";

type UsePropertyEditorOptions = {
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onEditStarted: () => void;
  properties: Property[];
};

export function usePropertyEditor({
  isAuthenticated,
  onAuthRequired,
  onEditStarted,
  properties,
}: UsePropertyEditorOptions) {
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    createInitialPropertyForm(),
  );
  const [propertyFormError, setPropertyFormError] = useState("");
  const [addressLookup, setAddressLookup] =
    useState<AddressLookupState>(idleAddressLookup);
  const [manualPropertyCoordinates, setManualPropertyCoordinates] =
    useState<Coordinates | null>(null);

  const editingProperty = editingPropertyId
    ? properties.find((property) => property.id === editingPropertyId)
    : undefined;
  const isEditingProperty = Boolean(editingProperty);
  const addressVerified =
    addressLookup.status === "found" &&
    !manualPropertyCoordinates &&
    addressLookup.query === propertyForm.location.trim();
  const propertyFormRating = useMemo(() => {
    const scores = Object.values(propertyForm.criteriaScores);

    return scores.reduce((sum, score) => sum + Number(score), 0) / scores.length;
  }, [propertyForm.criteriaScores]);

  useEffect(() => {
    if (!addPropertyOpen) {
      return;
    }

    if (manualPropertyCoordinates) {
      return;
    }

    const query = propertyForm.location.trim();

    if (query.length < 4) {
      return;
    }

    let ignoreLookup = false;
    const timer = window.setTimeout(async () => {
      setAddressLookup({
        coordinates: null,
        label: "",
        message: "Sprawdzam adres na mapie...",
        query,
        status: "loading",
      });

      try {
        const result = await geocodeLocation(query);

        if (!ignoreLookup) {
          setAddressLookup({
            coordinates: result.coordinates,
            label: result.label,
            message: "Znaleziono lokalizację na mapie.",
            query,
            status: "found",
          });
        }
      } catch (error) {
        if (!ignoreLookup) {
          setAddressLookup({
            coordinates: null,
            label: "",
            message: getErrorMessage(error),
            query,
            status: "error",
          });
        }
      }
    }, 900);

    return () => {
      ignoreLookup = true;
      window.clearTimeout(timer);
    };
  }, [addPropertyOpen, manualPropertyCoordinates, propertyForm.location]);

  const openAddProperty = useCallback(
    (coordinates?: Coordinates) => {
      if (!isAuthenticated) {
        onAuthRequired();
        return;
      }

      setPropertyForm({
        ...createInitialPropertyForm(),
        location: coordinates ? formatManualLocationLabel(coordinates) : "",
      });
      setPropertyFormError("");
      setEditingPropertyId(null);
      setManualPropertyCoordinates(coordinates ?? null);
      setAddressLookup(idleAddressLookup);
      setAddPropertyOpen(true);
    },
    [isAuthenticated, onAuthRequired],
  );

  const openEditProperty = useCallback(
    (property: Property) => {
      setPropertyForm(createPropertyFormFromProperty(property));
      setPropertyFormError("");
      setEditingPropertyId(property.id);
      // Seed with the property's existing coordinates so opening the edit form
      // doesn't re-geocode its already-resolved (or manually pinned) location.
      // Editing the location field below clears this and re-enables lookup.
      setManualPropertyCoordinates(property.coordinates);
      setAddressLookup(idleAddressLookup);
      setAddPropertyOpen(true);
      onEditStarted();
    },
    [onEditStarted],
  );

  const closeAddProperty = useCallback(() => {
    setAddPropertyOpen(false);
    setEditingPropertyId(null);
    setManualPropertyCoordinates(null);
    setPropertyFormError("");
    setAddressLookup(idleAddressLookup);
  }, []);

  function updatePropertyForm<Key extends keyof PropertyFormState>(
    key: Key,
    value: PropertyFormState[Key],
  ) {
    if (key === "location") {
      setManualPropertyCoordinates(null);
    }

    setPropertyForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function updatePropertyType(type: PropertyType) {
    setPropertyForm((currentForm) => ({
      ...currentForm,
      type,
      criteriaScores: Object.fromEntries(
        criteriaByType[type].map((criterion) => [
          criterion,
          currentForm.criteriaScores[criterion] ?? "7",
        ]),
      ),
    }));
  }

  function updateCriterionScore(label: string, score: string) {
    setPropertyForm((currentForm) => ({
      ...currentForm,
      criteriaScores: {
        ...currentForm.criteriaScores,
        [label]: score,
      },
    }));
  }

  function resetPropertyForm() {
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setManualPropertyCoordinates(null);
    setAddressLookup(idleAddressLookup);
    setAddPropertyOpen(false);
  }

  return {
    addPropertyOpen,
    addressLookup,
    addressVerified,
    closeAddProperty,
    editingProperty,
    editingPropertyId,
    isEditingProperty,
    manualPropertyCoordinates,
    openAddProperty,
    openEditProperty,
    propertyForm,
    propertyFormError,
    propertyFormRating,
    resetPropertyForm,
    setAddressLookup,
    setPropertyForm,
    setPropertyFormError,
    updateCriterionScore,
    updatePropertyForm,
    updatePropertyType,
  };
}
