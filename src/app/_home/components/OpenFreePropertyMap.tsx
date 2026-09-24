"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibre,
  type MapMouseEvent,
  type Map as MapLibreMap,
  type MapTouchEvent,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";

import {
  defaultMapCenter,
  fullPropertyMarkerMinZoom,
  getMapViewportPadding,
  getMarkerScaleForZoom,
  getUserLocationViewportPadding,
  openFreeMapStyleUrl,
  propertyClusterCountLayerId,
  propertyClusterLayerId,
  propertyClusterPointLayerId,
  propertyClusterSourceId,
  selectedPropertyFocusZoom,
  userLocationCoreLayerId,
  userLocationHaloLayerId,
  userLocationRadiusKm,
  userLocationSourceId,
  userRadiusFillLayerId,
  userRadiusLineLayerId,
  userRadiusSourceId,
} from "../map-config";
import {
  createEmptyFeatureCollection,
  createPropertyClusterFeatureCollection,
  createRadiusFeatureCollection,
  createUserLocationFeatureCollection,
  getRadiusBounds,
} from "../map-geojson";
import { getPropertyRating } from "../property-utils";
import type { Coordinates, Property } from "../types";
import { TypeIcon } from "./TypeIcon";

setWorkerUrl("/maplibre-gl-worker.mjs");

export function PropertyMapMarkerContent({
  property,
  rating,
}: {
  property: Property;
  rating: number;
}) {
  const primaryPhoto = property.photos[0];

  return (
    <span className="property-map-pin" data-has-photo={primaryPhoto ? "true" : "false"}>
      <span className="property-map-pin__media">
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryPhoto.url} alt="" />
        ) : (
          <TypeIcon type={property.type} className="size-5" />
        )}
      </span>
      <span className="property-map-pin__rating">{rating.toFixed(1)}</span>
    </span>
  );
}


export type MapMarkerInstance = {
  element: HTMLElement;
  marker: Marker;
  propertyId: string;
  root: Root;
};

export function disposeMapMarker({ marker, root }: MapMarkerInstance) {
  marker.remove();
  queueMicrotask(() => {
    root.unmount();
  });
}

export function OpenFreePropertyMap({
  properties,
  selectedPropertyId,
  userLocation,
  userLocationFocusRequest,
  onSelect,
  onLongPress,
}: {
  properties: Property[];
  selectedPropertyId: string | null;
  userLocation: Coordinates | null;
  userLocationFocusRequest: number;
  onSelect: (propertyId: string) => void;
  onLongPress: (coordinates: Coordinates) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapMarkerInstance[]>([]);
  const hasCenteredUserLocationRef = useRef(false);
  const handledUserLocationFocusRequestRef = useRef(0);
  const onLongPressRef = useRef(onLongPress);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new MapLibre({
      attributionControl: false,
      center: [defaultMapCenter.lng, defaultMapCenter.lat],
      container: containerRef.current,
      pitch: 0,
      style: openFreeMapStyleUrl,
      zoom: 10,
    });

    map.on("load", () => {
      map.addSource(userRadiusSourceId, {
        type: "geojson",
        data: createEmptyFeatureCollection(),
      });
      map.addLayer({
        id: userRadiusFillLayerId,
        type: "fill",
        source: userRadiusSourceId,
        paint: {
          "fill-color": "#f3a43b",
          "fill-opacity": 0.09,
        },
      });
      map.addLayer({
        id: userRadiusLineLayerId,
        type: "line",
        source: userRadiusSourceId,
        paint: {
          "line-color": "#f3a43b",
          "line-opacity": 0.34,
          "line-width": 1.5,
        },
      });
      map.addSource(userLocationSourceId, {
        type: "geojson",
        data: createEmptyFeatureCollection(),
      });
      map.addLayer({
        id: userLocationHaloLayerId,
        type: "circle",
        source: userLocationSourceId,
        paint: {
          "circle-color": "#f4aa23",
          "circle-opacity": 0.1,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 8, 12, 16],
        },
      });
      map.addLayer({
        id: userLocationCoreLayerId,
        type: "circle",
        source: userLocationSourceId,
        paint: {
          "circle-color": "#f4aa23",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 12, 8],
          "circle-stroke-color": "rgba(255, 255, 255, 0.94)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 12, 3],
        },
      });
      map.addSource(propertyClusterSourceId, {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: fullPropertyMarkerMinZoom - 1,
        clusterRadius: 58,
        data: createPropertyClusterFeatureCollection([]),
      });
      map.addLayer({
        id: propertyClusterLayerId,
        type: "circle",
        source: propertyClusterSourceId,
        filter: ["has", "point_count"],
        maxzoom: fullPropertyMarkerMinZoom,
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#3d7b62",
            5,
            "#16845c",
            12,
            "#143d2d",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            5,
            23,
            12,
            29,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 4,
        },
      });
      map.addLayer({
        id: propertyClusterCountLayerId,
        type: "symbol",
        source: propertyClusterSourceId,
        filter: ["has", "point_count"],
        maxzoom: fullPropertyMarkerMinZoom,
        layout: {
          "text-allow-overlap": true,
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(23, 33, 29, 0.35)",
          "text-halo-width": 1,
        },
      });
      map.addLayer({
        id: propertyClusterPointLayerId,
        type: "circle",
        source: propertyClusterSourceId,
        filter: ["!", ["has", "point_count"]],
        maxzoom: fullPropertyMarkerMinZoom,
        paint: {
          "circle-color": "#143d2d",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 5, 11, 9],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      setMapStatus("ready");
    });
    map.on("error", () => {
      if (!map.loaded()) {
        setMapStatus("error");
      }
    });
    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = "";
    };
    let longPressTimer: number | undefined;
    let longPressStartPoint: { x: number; y: number } | null = null;

    const cancelLongPress = () => {
      if (longPressTimer !== undefined) {
        window.clearTimeout(longPressTimer);
        longPressTimer = undefined;
      }
      longPressStartPoint = null;
    };
    const scheduleLongPress = (event: MapMouseEvent | MapTouchEvent) => {
      cancelLongPress();
      longPressStartPoint = event.point;
      longPressTimer = window.setTimeout(() => {
        longPressTimer = undefined;
        longPressStartPoint = null;
        onLongPressRef.current({
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        });
      }, 650);
    };
    const cancelLongPressAfterMove = (event: MapMouseEvent | MapTouchEvent) => {
      if (!longPressStartPoint) {
        return;
      }

      const movement = Math.hypot(
        event.point.x - longPressStartPoint.x,
        event.point.y - longPressStartPoint.y,
      );

      if (movement > 8) {
        cancelLongPress();
      }
    };

    map.on("click", propertyClusterLayerId, async (event) => {
      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)
        ?.coordinates;
      const source = map.getSource(propertyClusterSourceId) as GeoJSONSource | undefined;

      if (!source || !Number.isFinite(clusterId) || !coordinates) {
        return;
      }

      const expansionZoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: coordinates,
        duration: 550,
        zoom: Math.min(expansionZoom, 15),
      });
    });
    map.on("click", propertyClusterPointLayerId, (event) => {
      const propertyId = event.features?.[0]?.properties?.id;
      if (typeof propertyId === "string") {
        onSelect(propertyId);
      }
    });
    map.on("mouseenter", propertyClusterLayerId, setPointerCursor);
    map.on("mouseleave", propertyClusterLayerId, clearPointerCursor);
    map.on("mouseenter", propertyClusterPointLayerId, setPointerCursor);
    map.on("mouseleave", propertyClusterPointLayerId, clearPointerCursor);
    map.on("mousedown", scheduleLongPress);
    map.on("touchstart", scheduleLongPress);
    map.on("mousemove", cancelLongPressAfterMove);
    map.on("touchmove", cancelLongPressAfterMove);
    map.on("mouseup", cancelLongPress);
    map.on("touchend", cancelLongPress);
    map.on("dragstart", cancelLongPress);
    map.on("zoomstart", cancelLongPress);
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    return () => {
      cancelLongPress();
      markersRef.current.forEach(disposeMapMarker);
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const updateMarkerScale = () => {
      const shouldShowFullMarkers = map.getZoom() >= fullPropertyMarkerMinZoom;
      const markerScale = getMarkerScaleForZoom(map.getZoom());
      markersRef.current.forEach(({ element }) => {
        element.style.setProperty("--map-marker-scale", markerScale.toFixed(3));
        element.hidden = !shouldShowFullMarkers;
      });
    };

    markersRef.current.forEach(disposeMapMarker);
    markersRef.current = properties.map((property) => {
      const rating = getPropertyRating(property);
      const markerElement = document.createElement("button");
      markerElement.className = "property-map-marker";
      markerElement.dataset.selected = String(property.id === selectedPropertyId);
      markerElement.type = "button";
      markerElement.setAttribute("aria-label", `${property.title}, ocena ${rating}`);
      markerElement.setAttribute(
        "aria-pressed",
        String(property.id === selectedPropertyId),
      );
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(property.id);
      });

      const root = createRoot(markerElement);
      root.render(<PropertyMapMarkerContent property={property} rating={rating} />);

      const marker = new Marker({
        anchor: "center",
        element: markerElement,
      })
        .setLngLat([property.coordinates.lng, property.coordinates.lat])
        .addTo(map);

      return { element: markerElement, marker, propertyId: property.id, root };
    });
    updateMarkerScale();
    map.on("zoom", updateMarkerScale);

    return () => {
      map.off("zoom", updateMarkerScale);
      markersRef.current.forEach(disposeMapMarker);
      markersRef.current = [];
    };
  }, [mapStatus, onSelect, properties, selectedPropertyId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const source = map.getSource(propertyClusterSourceId) as GeoJSONSource | undefined;
    source?.setData(createPropertyClusterFeatureCollection(properties));
  }, [mapStatus, properties]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const source = map.getSource(userRadiusSourceId) as GeoJSONSource | undefined;
    source?.setData(
      userLocation
        ? createRadiusFeatureCollection(userLocation, userLocationRadiusKm)
        : createEmptyFeatureCollection(),
    );
    const userLocationSource = map.getSource(userLocationSourceId) as
      | GeoJSONSource
      | undefined;
    userLocationSource?.setData(createUserLocationFeatureCollection(userLocation));

    if (!userLocation) {
      hasCenteredUserLocationRef.current = false;
      return;
    }

    const shouldFocusRequestedLocation =
      userLocationFocusRequest > handledUserLocationFocusRequestRef.current;

    if (!hasCenteredUserLocationRef.current || shouldFocusRequestedLocation) {
      hasCenteredUserLocationRef.current = true;
      handledUserLocationFocusRequestRef.current = userLocationFocusRequest;
      map.fitBounds(getRadiusBounds(userLocation, userLocationRadiusKm), {
        duration: 700,
        maxZoom: 11.8,
        padding: getUserLocationViewportPadding(),
      });
    }
  }, [mapStatus, userLocation, userLocationFocusRequest]);

  useEffect(() => {
    const map = mapRef.current;
    const selectedProperty = properties.find(
      (property) => property.id === selectedPropertyId,
    );

    if (!map || !selectedProperty) {
      return;
    }

    map.easeTo({
      center: [selectedProperty.coordinates.lng, selectedProperty.coordinates.lat],
      duration: 550,
      padding: getMapViewportPadding(),
      zoom: Math.max(map.getZoom(), selectedPropertyFocusZoom),
    });
  }, [properties, selectedPropertyId]);

  return (
    <div
      className="openfree-map-shell"
      aria-label="Mapa OpenFreeMap z nieruchomościami"
      data-map-status={mapStatus}
    >
      <div ref={containerRef} className="openfree-map-canvas" />
      {mapStatus === "error" ? (
        <div className="map-load-error" role="status">
          Nie udało się załadować mapy. Sprawdź połączenie z OpenFreeMap.
        </div>
      ) : null}
    </div>
  );
}
