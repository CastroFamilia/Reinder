-- Story 10.3 — AC7: Invalidation trigger includes `images` field
--
-- The existing trigger `invalidate_listing_fit_scores()` in
-- 20260722000002_listing_fit_scores.sql monitors: price, size_sqm, bedrooms,
-- city, latitude, longitude — but NOT `images`.
--
-- This migration updates the function to also invalidate fit scores when
-- a listing's images array changes (e.g., agency adds/removes/reorders photos).
-- This ensures `recommended_photo_index` gets recalculated by the next batch job.

CREATE OR REPLACE FUNCTION public.invalidate_listing_fit_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.price IS DISTINCT FROM NEW.price
    OR OLD.size_sqm IS DISTINCT FROM NEW.size_sqm
    OR OLD.bedrooms IS DISTINCT FROM NEW.bedrooms
    OR OLD.city IS DISTINCT FROM NEW.city
    OR OLD.latitude IS DISTINCT FROM NEW.latitude
    OR OLD.longitude IS DISTINCT FROM NEW.longitude
    OR OLD.images IS DISTINCT FROM NEW.images
  ) THEN
    DELETE FROM public.listing_fit_scores
    WHERE listing_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
