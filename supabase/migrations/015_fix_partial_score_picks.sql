-- Fix match_picks where only one of the two score fields was set.
-- The missing side is treated as 0 (shutout), which matches user intent.
UPDATE public.match_picks
SET predicted_away_score = 0
WHERE predicted_home_score IS NOT NULL AND predicted_away_score IS NULL;

UPDATE public.match_picks
SET predicted_home_score = 0
WHERE predicted_away_score IS NOT NULL AND predicted_home_score IS NULL;
