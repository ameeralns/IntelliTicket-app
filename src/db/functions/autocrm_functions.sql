-- Transaction Management Functions
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Start a new transaction block
  IF NOT EXISTS (SELECT 1 FROM pg_stat_activity WHERE state = 'idle in transaction') THEN
    PERFORM set_config('autocrm.transaction_active', 'true', true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Commit the current transaction block
  IF current_setting('autocrm.transaction_active', true) = 'true' THEN
    PERFORM set_config('autocrm.transaction_active', 'false', true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Rollback the current transaction block
  IF current_setting('autocrm.transaction_active', true) = 'true' THEN
    ROLLBACK;
    PERFORM set_config('autocrm.transaction_active', 'false', true);
  END IF;
END;
$$;

-- Schema Inspection Function
CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text,
  constraints jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH column_constraints AS (
    SELECT
      c.column_name,
      jsonb_agg(
        jsonb_build_object(
          'type', tc.constraint_type,
          'name', tc.constraint_name,
          'definition', pg_get_constraintdef(tc.oid)
        )
      ) as constraints
    FROM information_schema.columns c
    LEFT JOIN information_schema.constraint_column_usage ccu 
      ON c.table_name = ccu.table_name 
      AND c.column_name = ccu.column_name
    LEFT JOIN pg_constraint tc 
      ON ccu.constraint_name = tc.conname
    WHERE c.table_name = table_name
    GROUP BY c.column_name
  )
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::boolean,
    c.column_default::text,
    COALESCE(cc.constraints, '[]'::jsonb)
  FROM information_schema.columns c
  LEFT JOIN column_constraints cc ON c.column_name = cc.column_name
  WHERE c.table_name = table_name
  ORDER BY c.ordinal_position;
END;
$$;

-- Utility Functions
CREATE OR REPLACE FUNCTION get_table_dependencies(table_name text)
RETURNS TABLE (
  dependent_table text,
  constraint_type text,
  constraint_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.table_name::text as dependent_table,
    tc.constraint_type::text,
    tc.constraint_name::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE ccu.table_name = table_name
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'PRIMARY KEY');
END;
$$;

CREATE OR REPLACE FUNCTION validate_changes(
  target_table text,
  changes jsonb
)
RETURNS TABLE (
  is_valid boolean,
  validation_errors jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  column_info record;
  validation_errors jsonb := '[]'::jsonb;
  is_valid boolean := true;
BEGIN
  -- Check each field in changes against table schema
  FOR column_info IN 
    SELECT * FROM get_table_schema(target_table)
  LOOP
    -- Check if required field is missing
    IF column_info.is_nullable = false 
    AND changes ? column_info.column_name = false THEN
      is_valid := false;
      validation_errors := validation_errors || 
        jsonb_build_object(
          'field', column_info.column_name,
          'error', 'Required field is missing'
        );
      CONTINUE;
    END IF;

    -- Check data type compatibility
    IF changes ? column_info.column_name THEN
      BEGIN
        EXECUTE format('SELECT ($1::%s) IS NOT NULL', column_info.data_type)
        USING changes->column_info.column_name;
      EXCEPTION WHEN OTHERS THEN
        is_valid := false;
        validation_errors := validation_errors || 
          jsonb_build_object(
            'field', column_info.column_name,
            'error', format('Invalid data type. Expected %s', column_info.data_type)
          );
      END;
    END IF;
  END LOOP;

  RETURN QUERY SELECT is_valid, validation_errors;
END;
$$;

-- Create the audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS autocrm_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID,
  table_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Functions
CREATE OR REPLACE FUNCTION log_autocrm_action()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO autocrm_audit_log (
    action_id,
    table_name,
    action_type,
    old_data,
    new_data,
    performed_by,
    performed_at
  ) VALUES (
    COALESCE(NEW.action_id, OLD.action_id),
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    current_user,
    current_timestamp
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for all AutoCRM tables
CREATE OR REPLACE FUNCTION create_audit_triggers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE 'autocrm_%'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS %I ON %I;
      CREATE TRIGGER %I
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION log_autocrm_action();
    ', 
    table_name || '_audit_trigger', 
    table_name,
    table_name || '_audit_trigger',
    table_name);
  END LOOP;
END;
$$; 