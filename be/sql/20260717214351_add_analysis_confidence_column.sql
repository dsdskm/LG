BEGIN;

-- Fix: column analysis.confidence does not exist
-- 대상 테이블: event_analyzer DB의 public.analysis
ALTER TABLE public.analysis
  ADD COLUMN IF NOT EXISTS confidence real;

COMMIT;
