-- =========================================================================
-- ELECTRA ELECTION YEAR COMPLETE DELETION AND CASCADE CLEANUP
-- Migration: 20261019_delete_election_year_cascade.sql
-- 
-- Description:
-- Creates an authoritative, transaction-safe PostgreSQL function
-- to permanently delete an election year and all its dependent records:
-- 1. electra_votes (scoped strictly to election_id)
-- 2. electra_election_results (scoped strictly to election_id)
-- 3. electra_accreditations (scoped strictly to election_id)
-- 4. electra_candidates (scoped strictly to election_id)
-- 5. electra_positions (scoped strictly to election_id)
-- 6. electra_news (scoped strictly to election_id)
-- 7. electra_elections (the election record itself)
-- 
-- SAFEGUARDS:
-- - All shared student records (verified_students, profiles, student portal accounts)
--   remain completely untouched.
-- - Other election years (e.g. 2024/2025, 2026/2027) remain completely untouched.
-- - Transaction safety: If any part fails, PostgreSQL rolls back entirely.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.delete_election_year_cascade(
  p_election_id TEXT,
  p_session TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_votes_count INTEGER := 0;
  v_results_count INTEGER := 0;
  v_accreditations_count INTEGER := 0;
  v_candidates_count INTEGER := 0;
  v_positions_count INTEGER := 0;
  v_news_count INTEGER := 0;
  v_elections_count INTEGER := 0;
  v_matched_election_ids TEXT[];
BEGIN
  -- Input validation
  IF p_election_id IS NULL OR TRIM(p_election_id) = '' THEN
    RAISE EXCEPTION 'p_election_id is required for deletion';
  END IF;

  -- 1. Identify all election IDs corresponding to p_election_id and/or p_session
  SELECT ARRAY_AGG(id) INTO v_matched_election_ids
  FROM public.electra_elections
  WHERE id = p_election_id
     OR (p_session IS NOT NULL AND TRIM(p_session) <> '' AND session = TRIM(p_session));

  -- If not found in electra_elections table, at least target p_election_id for child cleanup
  IF v_matched_election_ids IS NULL OR array_length(v_matched_election_ids, 1) = 0 THEN
    v_matched_election_ids := ARRAY[p_election_id];
  END IF;

  -- 2. Delete votes for the target election(s)
  WITH deleted_votes AS (
    DELETE FROM public.electra_votes
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_votes_count FROM deleted_votes;

  -- 3. Delete election results
  WITH deleted_results AS (
    DELETE FROM public.electra_election_results
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_results_count FROM deleted_results;

  -- 4. Delete accreditations (only for this election, NOT verified_students!)
  WITH deleted_accreditations AS (
    DELETE FROM public.electra_accreditations
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_accreditations_count FROM deleted_accreditations;

  -- 5. Delete candidates
  WITH deleted_candidates AS (
    DELETE FROM public.electra_candidates
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_candidates_count FROM deleted_candidates;

  -- 6. Delete positions
  WITH deleted_positions AS (
    DELETE FROM public.electra_positions
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_positions_count FROM deleted_positions;

  -- 7. Delete news items linked to this election
  WITH deleted_news AS (
    DELETE FROM public.electra_news
    WHERE election_id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_news_count FROM deleted_news;

  -- 8. Delete the election record(s)
  WITH deleted_elections AS (
    DELETE FROM public.electra_elections
    WHERE id = ANY(v_matched_election_ids)
    RETURNING 1
  )
  SELECT count(*) INTO v_elections_count FROM deleted_elections;

  RETURN jsonb_build_object(
    'success', true,
    'election_ids_deleted', v_matched_election_ids,
    'elections_deleted', v_elections_count,
    'positions_deleted', v_positions_count,
    'candidates_deleted', v_candidates_count,
    'accreditations_deleted', v_accreditations_count,
    'votes_deleted', v_votes_count,
    'results_deleted', v_results_count,
    'news_deleted', v_news_count,
    'timestamp', TIMEZONE('utc'::text, NOW())
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'delete_election_year_cascade failed: %', SQLERRM;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.delete_election_year_cascade(TEXT, TEXT) TO authenticated, service_role, anon;
