"use client";

import { useCallback, useEffect, useState } from "react";

import type { Coordinates, LocationStatus } from "../types";

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [userLocationFocusRequest, setUserLocationFocusRequest] = useState(0);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const updateCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => {
        setLocationStatus("unsupported");
      });
      return;
    }

    if (!("permissions" in navigator)) {
      queueMicrotask(() => {
        setLocationStatus((currentStatus) =>
          currentStatus === "unsupported" ? currentStatus : "idle",
        );
      });
      return;
    }

    let ignorePermissionChange = false;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (ignorePermissionChange) {
          return;
        }

        permissionStatus = status;

        if (status.state === "granted") {
          updateCurrentLocation();
        } else if (status.state === "denied") {
          setLocationStatus("denied");
        } else {
          setLocationStatus("idle");
        }

        status.onchange = () => {
          if (status.state === "granted") {
            updateCurrentLocation();
          } else if (status.state === "denied") {
            setLocationStatus("denied");
          } else {
            setLocationStatus("idle");
          }
        };
      })
      .catch(() => {
        setLocationStatus((currentStatus) =>
          currentStatus === "unsupported" ? currentStatus : "idle",
        );
      });

    return () => {
      ignorePermissionChange = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [updateCurrentLocation]);

  function requestCurrentLocation() {
    setUserLocationFocusRequest((requestId) => requestId + 1);
    updateCurrentLocation();
  }

  return {
    locationStatus,
    requestCurrentLocation,
    userLocation,
    userLocationFocusRequest,
  };
}
