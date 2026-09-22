import { createClient as createSupabaseClient } from "@/lib/supabase/browser";
import type { Property, PropertyPhoto } from "./types";

export const propertyPhotoBucket = "property-photos";

export async function signPhotoUrl(photo: PropertyPhoto): Promise<PropertyPhoto> {
  if (!photo.path) {
    return photo;
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage
    .from(propertyPhotoBucket)
    .createSignedUrl(photo.path, 60 * 60);

  if (error || !data?.signedUrl) {
    return photo;
  }

  return {
    ...photo,
    url: data.signedUrl,
  };
}

export async function hydratePropertyPhotoUrls(property: Property): Promise<Property> {
  return {
    ...property,
    photos: await Promise.all(property.photos.map(signPhotoUrl)),
  };
}
