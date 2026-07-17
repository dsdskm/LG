BEGIN;

-- Fix: column event.full_log does not exist
-- 대상 테이블: event_receiver DB의 public.events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS full_log jsonb;

COMMIT;
